// src/workout-plans/workout-plans.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, PopulateOptions, Document } from 'mongoose';
import {
  WorkoutPlan,
  WorkoutPlanDocument,
  PlanExercise,
  WorkoutDay,
} from './schemas/workout-plan.schema';
import { RecommendationService } from 'src/recommendations/recommendations.service';
import { ExercisesService } from 'src/exercises/exercises.service';
import { SwapExerciseDto } from './dto/swap-exercise.dto';
import {
  Exercise,
  ExerciseDocument,
} from 'src/exercises/schemas/exercise.schema';

// 🎯 Definiujemy typy dla spopulowanych dokumentów
// Muszą one pasować do schematu (który teraz jawnie ma _id)
type PopulatedPlanExercise = PlanExercise & {
  exercise: ExerciseDocument | null;
};
type PopulatedWorkoutDay = WorkoutDay & { exercises: PopulatedPlanExercise[] };
type FullyPopulatedPlan = WorkoutPlanDocument & { days: PopulatedWorkoutDay[] };

@Injectable()
export class WorkoutPlansService {
  private readonly logger = new Logger(WorkoutPlansService.name);

  constructor(
    @InjectModel(WorkoutPlan.name)
    private workoutPlanModel: Model<WorkoutPlanDocument>,
    private recommendationService: RecommendationService,
    private exercisesService: ExercisesService,
  ) {}

  private readonly populateOptions: PopulateOptions = {
    path: 'days.exercises.exercise',
    model: 'Exercise',
  };

  // 🎯 POPRAWKA: Type guard do sprawdzenia czy exercise jest spopulowany
  private isPopulatedExercise(
    exercise: ExerciseDocument | Types.ObjectId,
  ): exercise is ExerciseDocument {
    return (
      exercise &&
      typeof exercise === 'object' &&
      '_id' in exercise &&
      'apiId' in exercise
    );
  }

  async findAllForUser(userId: string): Promise<WorkoutPlan[]> {
    const plans = await this.workoutPlanModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ isActive: -1, createdAt: -1 })
      .populate(this.populateOptions)
      .lean()
      .exec();
    return plans as WorkoutPlan[];
  }

  async findOne(planId: string, userId: string): Promise<FullyPopulatedPlan> {
    const plan = await this.workoutPlanModel
      .findById(planId)
      .populate(this.populateOptions)
      .exec();

    if (!plan) {
      throw new NotFoundException('Nie znaleziono planu o podanym ID');
    }
    if (plan.user.toString() !== userId.toString()) {
      throw new ForbiddenException('Nie masz dostępu do tego zasobu');
    }
    return plan as FullyPopulatedPlan;
  }

  async remove(planId: string, userId: string): Promise<{ message: string }> {
    const plan = await this.findOne(planId, userId);
    await this.workoutPlanModel.deleteOne({ _id: plan._id }).exec();

    if (plan.isActive) {
      const nextPlan = await this.workoutPlanModel
        .findOne({ user: new Types.ObjectId(userId) })
        .sort({ createdAt: -1 })
        .exec();

      if (nextPlan) {
        nextPlan.isActive = true;
        await nextPlan.save();
      }
    }

    return { message: 'Plan został pomyślnie usunięty' };
  }

  async setActivePlan(planId: string, userId: string): Promise<WorkoutPlan> {
    const targetPlan = await this.workoutPlanModel
      .findOne({
        _id: new Types.ObjectId(planId),
        user: new Types.ObjectId(userId),
      })
      .populate(this.populateOptions)
      .exec();

    if (!targetPlan) {
      throw new NotFoundException('Nie znaleziono planu o podanym ID');
    }

    await this.workoutPlanModel.updateMany(
      {
        user: new Types.ObjectId(userId),
        _id: { $ne: targetPlan._id },
        isActive: true,
      },
      { $set: { isActive: false } },
    );

    if (!targetPlan.isActive) {
      targetPlan.isActive = true;
      await targetPlan.save();
    }

    return targetPlan.toObject() as WorkoutPlan;
  }

  /**
   * "SMART SWAP" (Wersja 6.x) - korzysta TYLKO z bazy swap_exercises (nie z Golden List)
   * 🎯 UWZGLĘDNIA equipmentPreset użytkownika - nie oferuje sprzętu, którego nie ma
   * 🎯 NIE OFERUJE tego samego ćwiczenia ani ćwiczeń już używanych w danym dniu
   * "SMART SWAP" (Wersja 6.x) - korzysta TYLKO z bazy swap_exercises (nie z Golden List)
   * 🎯 UWZGLĘDNIA equipmentPreset użytkownika - nie oferuje sprzętu, którego nie ma
   * 🎯 NIE OFERUJE tego samego ćwiczenia ani ćwiczeń już używanych w danym dniu
   */
  async swapExercise(
    dto: SwapExerciseDto,
    userId: string,
  ): Promise<WorkoutPlan> {
    const plan = await this.findOne(dto.planId, userId);

    const day = plan.days.find((d) => d._id.toString() === dto.dayId);
    if (!day) throw new NotFoundException('Nie znaleziono dnia w planie.');

    const exerciseIndex = day.exercises.findIndex(
      (ex) => ex._id.toString() === dto.exerciseToSwapId,
    );
    if (exerciseIndex === -1)
      throw new NotFoundException('Nie znaleziono ćwiczenia w tym dniu.');

    const planExerciseToSwap = day.exercises[exerciseIndex];
    const exerciseToSwap = planExerciseToSwap.exercise;

    if (!this.isPopulatedExercise(exerciseToSwap)) {
      throw new BadRequestException(
        'Nie można odczytać danych ćwiczenia do podmiany (błąd populate?).',
      );
    }
    
    // 🎯 Pobieramy equipmentPreset z planu użytkownika
    const userEquipmentPreset = (plan as any).equipmentPreset || 'gym';
    const allowedEquipment = this.getAllowedEquipmentForPreset(userEquipmentPreset);
    
    this.logger.log(`[Smart Swap] Preset użytkownika: ${userEquipmentPreset}, dozwolony sprzęt: ${allowedEquipment.join(', ')}`);
    
    // Pobieramy podobne ćwiczenia z bazy swap_exercises (1300+)
    const similarExercises = await this.recommendationService.getSimilarExercises(
      exerciseToSwap.apiId,
      100, // Więcej opcji, bo będziemy mocno filtrować
    );

    if (similarExercises.length === 0) {
      throw new BadRequestException(
        'Nie znaleziono alternatywnych ćwiczeń w Bibliotece Swapów.',
      );
    }

    // 🎯 Zbieramy apiId ćwiczeń już używanych w danym dniu (żeby uniknąć duplikatów)
    const usedApiIdsInDay = new Set(
      day.exercises
        .map(ex => this.isPopulatedExercise(ex.exercise) ? ex.exercise.apiId : null)
        .filter((apiId): apiId is string => apiId !== null)
    );

    this.logger.log(`[Smart Swap] Używane apiId w tym dniu: ${Array.from(usedApiIdsInDay).join(', ')}`);

    // 🎯 FILTRUJEMY:
    // 1. Po dozwolonym sprzęcie
    // 2. NIE używane już w tym dniu
    // 3. NIE to samo ćwiczenie (apiId)
    const filteredExercises = similarExercises.filter(ex => {
      const hasAllowedEquipment = allowedEquipment.includes(ex.equipment?.toLowerCase());
      const notUsedInDay = !usedApiIdsInDay.has(ex.apiId);
      const notSameExercise = ex.apiId !== exerciseToSwap.apiId;
      
      return hasAllowedEquipment && notUsedInDay && notSameExercise;
    });

    if (filteredExercises.length === 0) {
      throw new BadRequestException(
        'Nie znaleziono pasującego zamiennika dla tego ćwiczenia w Twoich warunkach sprzętowych.',
      );
    }

    this.logger.log(`[Smart Swap] Znaleziono ${filteredExercises.length} unikalnych ćwiczeń pasujących do kryteriów.`);

    // 🎯 Wybieramy tylko te ćwiczenia, które JUŻ istnieją w Golden List (bez dodawania nowych)
    const candidateApiIds = filteredExercises.map((ex) => ex.apiId);
    let newExerciseDoc = (
      await this.exercisesService.findExercisesByFilter(
        { apiId: { $in: candidateApiIds } },
        candidateApiIds.length,
      )
    )[0];

    if (!newExerciseDoc) {
      // Fallback: utwórz ćwiczenie w bazie exercises z danych Swap (exercises.json)
      const sourceSwap = filteredExercises[0];
      newExerciseDoc = await this.exercisesService.createExerciseFromSwap({
        apiId: sourceSwap.apiId,
        name: sourceSwap.name,
        name_pl: sourceSwap.name_pl,
        bodyPart: sourceSwap.bodyPart,
        target: sourceSwap.target,
        equipment: sourceSwap.equipment,
        gifUrl: (sourceSwap as any).gifUrl,
        secondaryMuscles: (sourceSwap as any).secondaryMuscles ?? [],
        instructions: (sourceSwap as any).instructions ?? [],
      });
    }
    this.logger.log(
      `🔄 Podmieniam "${exerciseToSwap.name_pl}" (${exerciseToSwap.apiId}) na "${newExerciseDoc.name_pl}" (${newExerciseDoc.apiId})`,
    );

    this.logger.log(`🔄 Podmieniam "${exerciseToSwap.name_pl}" (${exerciseToSwap.apiId}) na "${newExerciseDoc.name_pl}" (${newExerciseDoc.apiId})`);

    day.exercises[exerciseIndex].exercise = newExerciseDoc._id as Types.ObjectId;
    day.exercises[exerciseIndex].name = newExerciseDoc.name;
    day.exercises[exerciseIndex].name_pl = newExerciseDoc.name_pl;

    plan.markModified('days');
    const savedPlan = await plan.save();

    const populatedSavedPlan = await this.workoutPlanModel
      .findById(savedPlan._id)
      .populate(this.populateOptions)
      .lean()
      .exec();

    return populatedSavedPlan as WorkoutPlan;
  }

  /**
   * 🎯 Mapuje equipmentPreset na dozwolone rodzaje sprzętu (tak samo jak w generatorze)
   */
  private getAllowedEquipmentForPreset(preset: string): string[] {
    switch (preset) {
      case 'body-weight':
        return ['body weight', 'pull-up bar', 'stability ball'];
      
      case 'free-weight':
        return [
          'barbell', 'dumbbell', 'kettlebell', 'weighted', 
          'body weight', 'pull-up bar'
        ];
      
      case 'gym':
      default:
        return [
          'barbell', 'dumbbell', 'kettlebell', 'weighted',
          'body weight', 'pull-up bar',
          'cable', 'leverage machine', 'sled machine', 
          'trap bar', 'wheel roller', 'stability ball'
        ];
    }
  }
}