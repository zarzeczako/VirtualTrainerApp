import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { ExercisesService } from 'src/exercises/exercises.service';
import {
  GeneratePlanDto,
  TrainingLevel,
  TrainingGoal,
  EquipmentPreset, 
} from './dto/generate-plan.dto';
import {
  WorkoutPlan,
  WorkoutPlanDocument,
  WorkoutDay,
  PlanExercise,
} from './schemas/workout-plan.schema';
import { UserDocument } from 'src/users/schema/user.schema';
import { Exercise, ExerciseDocument, ExerciseRole, ExercisePattern } from 'src/exercises/schemas/exercise.schema';
import { RecommendationService } from 'src/recommendations/recommendations.service';
import { PlanRefinementService } from './plan-refinement/plan-refinement.service';

// --- TYPY DLA GENERATORA V6.x ---
type MappedExercisePool = {
  [key in ExerciseRole]: ExerciseDocument[];
};
type PatternPool = {
  [key in ExercisePattern]: ExerciseDocument[];
};
type ExerciseParams = {
  main_compound: { sets: number; reps: string };
  accessory: { sets: number; reps: string };
  isolation: { sets: number; reps: string };
  core: { sets: number; reps: string };
  default: { sets: number; reps: string };
};

@Injectable()
export class PlanGeneratorService {
  private readonly logger = new Logger(PlanGeneratorService.name);

  private readonly NON_STRENGTH_BLOCKLIST = ['stretch', 'rozciąganie', 'hook', 'boxing', 'jump rope', 'cardio', 'spacer', 'walk', 'run', 'bieg', 'spell caster', 'yoga', 'pilates', 'mobility', 'mobilność', 'dynamiczne'];

  private readonly LEVEL_LABELS: Record<TrainingLevel, string> = {
    [TrainingLevel.BEGINNER]: 'początkujących',
    [TrainingLevel.INTERMEDIATE]: 'średniozaawansowanych',
    [TrainingLevel.ADVANCED]: 'zaawansowanych',
  };

  private readonly GOAL_LABELS: Record<TrainingGoal, string> = {
    [TrainingGoal.CALISTHENICS]: 'kalisteniki',
    [TrainingGoal.STRENGTH]: 'budowania siły',
    [TrainingGoal.HYPERTROPHY]: 'masy mięśniowej',
    [TrainingGoal.GENERAL]: 'ogólnej sprawności',
  };

  constructor(
    @InjectModel(WorkoutPlan.name)
    private workoutPlanModel: Model<WorkoutPlanDocument>,
    private exercisesService: ExercisesService,
    private recommendationService: RecommendationService,
    private planRefinementService: PlanRefinementService,
  ) {}

  async generatePlan(
    dto: GeneratePlanDto,
    user: UserDocument,
  ): Promise<WorkoutPlan> {
    this.logger.log(`[V6.x] Generowanie planu dla ${user.email}...`);

    // Ta linia jest już poprawna
    const baseFilter = this.buildBaseFilter(dto.goal, dto.equipment, dto.level);
    const { byRole, byPattern } = await this.getAndCategorizeExercisesFromDB(baseFilter);

    const mainPushCount = (byPattern[ExercisePattern.PUSH_H]?.length || 0) + (byPattern[ExercisePattern.PUSH_V]?.length || 0);
    const mainPullCount = (byPattern[ExercisePattern.PULL_H]?.length || 0) + (byPattern[ExercisePattern.PULL_V]?.length || 0);
    const mainLegsCount = (byPattern[ExercisePattern.QUAD]?.length || 0) + (byPattern[ExercisePattern.HINGE]?.length || 0);

    if (mainPushCount < 1 || mainPullCount < 1 || mainLegsCount < 1) {
       this.logger.error(`Błąd kategoryzacji - brak kluczowych ćwiczeń Push/Pull/Legs (P:${mainPushCount}, Pu:${mainPullCount}, L:${mainLegsCount}) dla filtrów: ${JSON.stringify(baseFilter)}`);
      throw new BadRequestException('Nie udało się znaleźć wystarczającej liczby głównych ćwiczeń (Push/Pull/Legs) dla wybranych filtrów.');
    }

    const params = this.getParamsByLevel(dto.level, dto.goal);
    let generatedDays: WorkoutDay[] = [];
    
    const poolCopy = JSON.parse(JSON.stringify(byPattern));
    const rolePoolCopy = JSON.parse(JSON.stringify(byRole));

    switch (dto.daysPerWeek) {
      case 2:
      case 3:
        generatedDays = this.generateFBWPlan(poolCopy, params, dto.daysPerWeek, rolePoolCopy);
        break;
      case 4:
        generatedDays = this.generateUpperLowerPlan(poolCopy, params, rolePoolCopy);
        break;
      case 5:
        generatedDays = this.generatePPLULPlan(poolCopy, params, rolePoolCopy);
        break;
      default:
        throw new BadRequestException('Nieobsługiwana liczba dni treningowych.');
    }

    const refinedDays = await this.planRefinementService.refinePlan(generatedDays);
    this.logger.log("Plan pomyślnie przeszedł przez Recenzenta AI.");

    await this.workoutPlanModel.updateMany(
      { user: user._id, isActive: true },
      { $set: { isActive: false } },
    );

    const newPlan = new this.workoutPlanModel({
      name: dto.name,
      user: user._id,
      level: dto.level,
      goal: dto.goal,
      daysPerWeek: dto.daysPerWeek,
      equipmentPreset: dto.equipment,
      days: refinedDays,
      description: this.buildPlanDescription(dto.daysPerWeek, dto.goal, dto.level),
      isActive: true,
    });

    const savedPlan = await newPlan.save();
    
    const populatedPlan = await this.workoutPlanModel
      .findById(savedPlan._id)
      .populate('days.exercises.exercise')
      .lean()
      .exec();
    
    this.logger.log(`✅ Plan "${dto.name}" został wygenerowany i zapisany z pełnymi danymi ćwiczeń.`);
    return populatedPlan as WorkoutPlan;
  }

  private buildPlanDescription(daysPerWeek: number, goal: TrainingGoal, level: TrainingLevel): string {
    const goalLabel = this.GOAL_LABELS[goal] ?? goal;
    const levelLabel = this.LEVEL_LABELS[level] ?? level;
    return `Plan ${daysPerWeek}-dniowy dla ${levelLabel}, skupiony na ${goalLabel}.`;
  }

  // --- BUDOWANIE FILTRA ---
  // 🎯 POPRAWKA BŁĘDU TS2345: Zmieniono 'equipment: string[]' na 'equipmentPreset: EquipmentPreset'
  private buildBaseFilter(goal: TrainingGoal, equipmentPreset: EquipmentPreset, level: TrainingLevel): FilterQuery<ExerciseDocument> {
      
    const isCalisthenics = goal === TrainingGoal.CALISTHENICS;
    let effectiveEquipment: string[] = [];

  
    switch (equipmentPreset) {
      case EquipmentPreset.BODYWEIGHT:
        this.logger.log('Preset sprzętu: Body-weight. Używam: body weight, pull-up bar, stability ball.');
        effectiveEquipment = ['body weight', 'pull-up bar', 'stability ball'];
        break;
      
      case EquipmentPreset.FREE_WEIGHT:
        this.logger.log('Preset sprzętu: Free-weight. Używam: wolne ciężary + podstawy body-weight.');
        effectiveEquipment = [
          'barbell', 'dumbbell', 'kettlebell', 'weighted', 
          'body weight', 'pull-up bar'
        ];
        break;

      case EquipmentPreset.GYM:
        this.logger.log('Preset sprzętu: Gym. Używam całego dostępnego sprzętu.');
        effectiveEquipment = [
          'barbell', 'dumbbell', 'kettlebell', 'weighted',
          'body weight', 'pull-up bar',
          'cable', 'leverage machine', 'sled machine', 
          'trap bar', 'wheel roller', 'stability ball'
        ];
        break;
    }

    if (isCalisthenics) {
        this.logger.log('Cel: Kalistenika. Nadpisuję filtr sprzętu TYLKO pod kalistenikę.');
        const calisthenicsEquipment = ['body weight', 'pull-up bar', 'stability ball', 'weighted'];
        effectiveEquipment = effectiveEquipment.filter(e => calisthenicsEquipment.includes(e));
    }
      
     const filter: FilterQuery<ExerciseDocument> = {
      equipment: { $in: effectiveEquipment },
      name_pl: { $not: new RegExp(this.NON_STRENGTH_BLOCKLIST.join('|'), 'i') },
      role: { $exists: true, $ne: null },
      isGoldenList: true, // ⭐ Używaj TYLKO Golden List (102 ćwiczenia) do generowania planów
    };

    if (isCalisthenics) {
      this.logger.log('Cel: Kalistenika. Stosuję POPRAWIONY filtr trudności.');
      let difficultyRange: any;
      switch (level) {
        case TrainingLevel.ADVANCED:
          difficultyRange = { $gte: 7 };
          break;
        case TrainingLevel.INTERMEDIATE:
          difficultyRange = { $gte: 4, $lte: 7 };
          break;
        case TrainingLevel.BEGINNER:
        default:
          difficultyRange = { $lte: 4 };
          break;
      }
      filter.difficulty = difficultyRange;
      this.logger.log(
        `Filtr trudności (Kalistenika) dla ${level}: ${JSON.stringify(difficultyRange)}`,
      );
    } else {
      this.logger.log(
        `Cel: ${goal}. Ignoruję filtr trudności ćwiczeń (trudność = ciężar).`,
      );
    }
		
    return filter;
  }
  
 
  private async getAndCategorizeExercisesFromDB(
    filter: FilterQuery<ExerciseDocument>,
  ): Promise<{ byRole: MappedExercisePool; byPattern: PatternPool }> {
    this.logger.log(`Pobieram i kategoryzuję ćwiczenia z bazy z filtrem...`);

    const exercises = await this.exercisesService.findExercisesByFilter(filter, 1350);

    const byRole = Object.values(ExerciseRole).reduce((acc, role) => {
        acc[role] = [];
        return acc;
    }, {} as MappedExercisePool);

    const byPattern = Object.values(ExercisePattern).reduce((acc, pattern) => {
        acc[pattern] = [];
        return acc;
    }, {} as PatternPool);

    for (const ex of exercises) {
        if (ex.role && byRole[ex.role]) {
            byRole[ex.role].push(ex);
        } else {
             byRole[ExerciseRole.OTHER].push(ex);
        }
        if (ex.pattern && byPattern[ex.pattern]) {
            byPattern[ex.pattern].push(ex);
        } else {
             byPattern[ExercisePattern.OTHER].push(ex);
        }
    }
    
    this.logger.log(`Kategoryzacja zakończona. T1: ${byRole.main_t1.length}, T2: ${byRole.main_t2.length}, Acc: ${byRole.accessory.length}`);
    return { byRole, byPattern };
  }

  // --- INTELIGENTNE PARAMETRY ---
  private getParamsByLevel(level: TrainingLevel, goal: TrainingGoal): ExerciseParams {
    const isStrength = goal === TrainingGoal.STRENGTH;
    this.logger.log(`Cel: ${goal}. Dobieram parametry ${isStrength ? 'siłowe' : 'hipertroficzne'}.`);
    switch (level) {
      case TrainingLevel.ADVANCED:
        return {
          main_compound: { sets: 5, reps: isStrength ? '3-5' : '6-10' },
          accessory: { sets: 4, reps: '8-12' },
          isolation: { sets: 3, reps: '10-15' },
          core: { sets: 3, reps: '15-20' },
          default: { sets: 3, reps: '10-15'}
        };
      case TrainingLevel.INTERMEDIATE:
        return {
          main_compound: { sets: 4, reps: isStrength ? '5-8' : '8-10' },
          accessory: { sets: 3, reps: '8-12' },
          isolation: { sets: 3, reps: '10-15' },
          core: { sets: 3, reps: '12-15' },
          default: { sets: 3, reps: '10-15'}
        };
      default: // BEGINNER
        return {
          main_compound: { sets: 3, reps: isStrength ? '8-10' : '10-12' },
          accessory: { sets: 3, reps: '10-12' },
          isolation: { sets: 3, reps: '12-15' },
          core: { sets: 3, reps: '10-15' },
          default: { sets: 3, reps: '10-15'}
        };
    }
  }

  // --- STRATEGIE GENEROWANIA ---
  
  private getMainExercise(
    patternPool: PatternPool,
    pattern: ExercisePattern,
    chosen: ExerciseDocument[],
  ): ExerciseDocument | null {
    const originalPool = patternPool[pattern];
    if (!originalPool || originalPool.length === 0) {
      this.logger.warn(`Brak ćwiczeń w puli dla wzorca: ${pattern}`);
      return null;
    }
    
    let candidates = originalPool.filter(ex => ex.role === ExerciseRole.MAIN_T1);
    if (candidates.length === 0) {
      candidates = originalPool.filter(ex => ex.role === ExerciseRole.MAIN_T2);
    }
    if (candidates.length === 0) {
      candidates = originalPool.filter(ex => ex.role === ExerciseRole.ACCESSORY);
    }
    if (candidates.length === 0) {
       this.logger.warn(`Brak ćwiczeń MAIN lub ACCESSORY dla wzorca: ${pattern}`);
       const fallbackCandidates = originalPool.filter(ex => ex.role !== ExerciseRole.ISOLATION && ex.role !== ExerciseRole.CORE);
       if(fallbackCandidates.length === 0) return null;
       candidates = fallbackCandidates;
    }
    
    const choice = this.getDiverseExercise(candidates, chosen);
    if (choice) {
        const index = originalPool.findIndex(ex => ex.apiId === choice.apiId);
        if (index > -1) originalPool.splice(index, 1);
    }
    return choice;
  }

  private getAccessoryExercise(
    patterns: PatternPool,
    patternKeys: ExercisePattern[],
    chosen: ExerciseDocument[],
    byRole: MappedExercisePool,
  ): ExerciseDocument | null {
    let pool: ExerciseDocument[] = [];
    
    patternKeys.forEach(p => {
        const patternExercises = patterns[p];
        if (patternExercises) {
            pool.push(...patternExercises);
        }
    });

    if (pool.length === 0) {
        this.logger.warn(`⚠️ Brak ćwiczeń dla wzorców: ${patternKeys.join(', ')}. Używam puli rezerwowej.`);
        
        const UPPER_BODY_PATTERNS = [
          ExercisePattern.PUSH_H, ExercisePattern.PUSH_V,
          ExercisePattern.PULL_H, ExercisePattern.PULL_V,
          ExercisePattern.ARM_FLEXION, ExercisePattern.ARM_EXTENSION,
        ];
        
        const LOWER_BODY_PATTERNS = [
          ExercisePattern.QUAD, ExercisePattern.HINGE,
        ];
        
        const isUpperBody = patternKeys.some(p => UPPER_BODY_PATTERNS.includes(p));
        const isLowerBody = patternKeys.some(p => LOWER_BODY_PATTERNS.includes(p));
        
        const accessoryPool = byRole[ExerciseRole.ACCESSORY] || [];
        
        if (isUpperBody) {
          pool = accessoryPool.filter(ex => 
            ex.pattern && UPPER_BODY_PATTERNS.includes(ex.pattern)
          );
          this.logger.log(`🔼 Używam puli rezerwowej GÓRNA: ${pool.length} ćwiczeń`);
        } else if (isLowerBody) {
          pool = accessoryPool.filter(ex => 
            ex.pattern && LOWER_BODY_PATTERNS.includes(ex.pattern)
          );
          this.logger.log(`🔽 Używam puli rezerwowej DOLNA: ${pool.length} ćwiczeń`);
        } else {
          // Dla wzorców CORE, OTHER (np. łydki) używamy pełnej puli 'accessory'
          pool = accessoryPool;
        }
    }
    
    const choice = this.getDiverseExercise(pool, chosen);
    if (choice) {
      chosen.push(choice);
    }
    return choice;
  }

  private generateFBWPlan(
    patterns: PatternPool,
    params: ExerciseParams,
    days: number,
    byRole: MappedExercisePool,
  ): WorkoutDay[] {
    const workoutDays: WorkoutDay[] = [];
    const dayNames = ['Trening FBW A', 'Trening FBW B', 'Trening FBW C'];

    for (let i = 0; i < days; i++) {
      const chosenForThisDay: ExerciseDocument[] = [];
      const exercises: (PlanExercise | null)[] = [];

      if (i % 2 === 0) { 
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.QUAD, chosenForThisDay), params.main_compound));
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_H, chosenForThisDay), params.main_compound));
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_V, chosenForThisDay), params.main_compound));
      } else { 
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.HINGE, chosenForThisDay), params.main_compound));
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_V, chosenForThisDay), params.main_compound));
        exercises.push(this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_H, chosenForThisDay), params.main_compound));
      }
      
      exercises.push(this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION, ExercisePattern.ARM_EXTENSION, ExercisePattern.ISOLATION], chosenForThisDay, byRole), params.isolation));
      exercises.push(this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.CORE], chosenForThisDay, byRole), params.core));

      workoutDays.push({
        _id: new Types.ObjectId(), 
        name: dayNames[i],
        exercises: exercises.filter(Boolean) as PlanExercise[],
      });
    }
    return workoutDays;
  }


  private generateUpperLowerPlan(
    patterns: PatternPool,
    params: ExerciseParams,
    byRole: MappedExercisePool,
  ): WorkoutDay[] {
    const days: WorkoutDay[] = [];
    const chosen: ExerciseDocument[] = [];

    const UPPER_BODY_PATTERNS = [
      ExercisePattern.PUSH_H,
      ExercisePattern.PUSH_V,
      ExercisePattern.PULL_H,
      ExercisePattern.PULL_V,
      ExercisePattern.ARM_FLEXION,
      ExercisePattern.ARM_EXTENSION,
    ];
    const LOWER_BODY_PATTERNS = [
      ExercisePattern.QUAD,
      ExercisePattern.HINGE,
    ];
    const upperBodyPool: ExerciseDocument[] = [];
    const lowerBodyPool: ExerciseDocument[] = [];
    UPPER_BODY_PATTERNS.forEach(p => {
      if (patterns[p]) upperBodyPool.push(...patterns[p]);
    });
    LOWER_BODY_PATTERNS.forEach(p => {
      if (patterns[p]) lowerBodyPool.push(...patterns[p]);
    });
    this.logger.log(`🔥 Pule: Góra=${upperBodyPool.length}, Dół=${lowerBodyPool.length}`);


    days.push({
      _id: new Types.ObjectId(),
      name: 'Góra A (Push/Pull)',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_H, chosen), params.main_compound),
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_V, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PUSH_V], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PULL_H], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_EXTENSION], chosen, byRole), params.isolation),
      ].filter(Boolean) as PlanExercise[],
    });

 
    days.push({
      _id: new Types.ObjectId(),
      name: 'Dół A (Quad)',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.QUAD, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.HINGE], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.QUAD], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.OTHER], chosen, byRole), params.isolation), // Łydki
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.CORE], chosen, byRole), params.core),
      ].filter(Boolean) as PlanExercise[],
    });

    // --- Dzień 3: Góra B (Pull Horizontal + Push Vertical) ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Góra B (Pull/Push)',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_H, chosen), params.main_compound),
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_V, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PULL_V], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PUSH_H], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_EXTENSION], chosen, byRole), params.isolation),
      ].filter(Boolean) as PlanExercise[],
    });

    // --- Dzień 4: Dół B (Hinge Dominant) ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Dół B (Hinge)',
      exercises: [
       this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.HINGE, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.QUAD], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.HINGE], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.OTHER], chosen, byRole), params.isolation), // Łydki
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.CORE], chosen, byRole), params.core),
      ].filter(Boolean) as PlanExercise[],
    });

    return days;
  }

  // Ta funkcja jest POPRAWNA
  private generatePPLULPlan(
    patterns: PatternPool,
    params: ExerciseParams,
    byRole: MappedExercisePool,
  ): WorkoutDay[] {
    let days: WorkoutDay[] = [];
   const chosen: ExerciseDocument[] = []; 

    // --- Dzień 1: Push ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Push',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_H, chosen), params.main_compound),
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PUSH_V, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PUSH_H, ExercisePattern.PUSH_V], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_EXTENSION], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_EXTENSION], chosen, byRole), params.isolation),
      ].filter(Boolean) as PlanExercise[],
    });

    // --- Dzień 2: Pull ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Pull',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_V, chosen), params.main_compound),
       this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.PULL_H, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PULL_V, ExercisePattern.PULL_H], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION], chosen, byRole), params.isolation),
   ].filter(Boolean) as PlanExercise[],
    });

    // --- Dzień 3: Legs ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Legs',
      exercises: [
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.QUAD, chosen), params.main_compound),
        this.createPlanExercise(this.getMainExercise(patterns, ExercisePattern.HINGE, chosen), params.main_compound),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.QUAD], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.HINGE], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.OTHER], chosen, byRole), params.isolation), // Łydki
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.CORE], chosen, byRole), params.core),
      ].filter(Boolean) as PlanExercise[],
    });
    
    // --- Dzień 4: Upper (Volume/Accessory focus) ---
   days.push({
      _id: new Types.ObjectId(),
      name: 'Upper (Volume)',
      exercises: [
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PUSH_H], chosen, byRole), params.accessory), 
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PULL_V], chosen, byRole), params.accessory), 
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PUSH_V], chosen, byRole), params.accessory), 
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.PULL_H], chosen, byRole), params.accessory), 
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_FLEXION], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.ARM_EXTENSION], chosen, byRole), params.isolation),
      ].filter(Boolean) as PlanExercise[],
    });

    // --- Dzień 5: Lower (Volume/Accessory focus) ---
    days.push({
      _id: new Types.ObjectId(),
      name: 'Lower (Volume)',
      exercises: [
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.QUAD], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.HINGE], chosen, byRole), params.accessory),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.QUAD], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.HINGE], chosen, byRole), params.isolation),
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.OTHER], chosen, byRole), params.isolation), // Łydki
        this.createPlanExercise(this.getAccessoryExercise(patterns, [ExercisePattern.CORE], chosen, byRole), params.core),
      ].filter(Boolean) as PlanExercise[],
    });
    
    return days;
  }

  // --- Funkcje Pomocnicze ---
  private getDiverseExercise(
    pool: ExerciseDocument[],
    chosenExercises: ExerciseDocument[],
  ): ExerciseDocument | null {
    if (pool.length === 0) return null;    const available = pool.filter(
      (exercise) => !chosenExercises.some((c) => c.apiId === exercise.apiId),
    );

    if (available.length === 0) {
      this.logger.warn(
        'Nie znaleziono unikalnego ćwiczenia, pula dostępnych jest pusta. Zwracam losowe ćwiczenie z oryginalnej puli.',
     );
      return pool[Math.floor(Math.random() * pool.length)];
    }

    return this.recommendationService.getMostDiverseExercise(
      available,
      chosenExercises,
    ) as ExerciseDocument;
}

  private createPlanExercise(
    exercise: ExerciseDocument | null,
    params: { sets: number; reps: string },
  ): PlanExercise | null {
    if (!exercise || !params || !exercise._id) return null;
    
    const planExerciseData: PlanExercise = {
      _id: new Types.ObjectId(), 
      exercise: exercise._id as Types.ObjectId,
      name: exercise.name,
      name_pl: exercise.name_pl,
      sets: params.sets,
      reps: params.reps,
    };
    return planExerciseData;
  }
}