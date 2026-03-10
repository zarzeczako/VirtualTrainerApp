// src/exercises/exercises.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import {
  SwapExercise,
  SwapExerciseDocument,
} from './schemas/swap-exercise.schema';
import { SwapExerciseData } from './interfaces/exercise.interface';

@Injectable()
export class ExercisesService {
  private readonly logger = new Logger(ExercisesService.name);

  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
    @InjectModel(SwapExercise.name)
    private readonly swapExerciseModel: Model<SwapExerciseDocument>,
  ) {}

  /**
   * Zwraca listę wszystkich ćwiczeń (tylko podstawowe pola) - bez zmian
   */
  async findAll(): Promise<Partial<ExerciseDocument>[]> {
    return this.exerciseModel
      .find()
      .select('name_pl bodyPart target equipment gifUrl')
      .exec();
  }

  /**
   * Wyszukuje ćwiczenie po polskiej nazwie (bez wrażliwości na wielkość liter).
   * Używa "Regex" do inteligentnego dopasowania.
   * @param namePl - Nazwa ćwiczenia (np. "pompki")
   */
  async findOneByNamePl(namePl: string): Promise<Exercise | null> {
    // Tworzymy bezpieczne wyrażenie regularne, aby znaleźć DOKŁADNIE tę frazę,
    // ignorując wielkość liter ('i')
    const nameRegex = new RegExp(`^${namePl.trim()}$`, 'i');

    return this.exerciseModel
      .findOne({ name_pl: { $regex: nameRegex } })
      .exec();
  }

  /**
   * 🆕 Zwraca WSZYSTKIE ćwiczenia ze Swap Library (1324) - dla Atlasu Ćwiczeń
   */
  async findAllSwap(): Promise<Partial<SwapExerciseDocument>[]> {
    return this.swapExerciseModel
      .find()
      .select('name_pl bodyPart target equipment gifUrl')
      .exec();
  }

  /**
   * 🆕 Zwraca jedno ćwiczenie ze Swap Library po ID
   */
  async findOneSwap(id: string): Promise<SwapExerciseDocument> {
    const exercise = await this.swapExerciseModel.findById(id).exec();
    if (!exercise) {
      throw new NotFoundException(
        `Nie znaleziono ćwiczenia o ID ${id} w Swap Library`,
      );
    }
    return exercise;
  }

  /**
   * 🆕 Zwraca ćwiczenia ze Swap Library dla danej partii ciała
   */
  async findSwapByBodyPart(
    bodyPart: string,
  ): Promise<Partial<SwapExerciseDocument>[]> {
    return this.swapExerciseModel
      .find({ bodyPart: bodyPart.toLowerCase() })
      .select('name_pl bodyPart target equipment gifUrl')
      .exec();
  }

  /**
   * Zwraca ćwiczenia dla danej partii ciała - bez zmian
   */
  async findByBodyPart(bodyPart: string): Promise<Partial<ExerciseDocument>[]> {
    return this.exerciseModel
      .find({ bodyPart: bodyPart.toLowerCase() })
      .select('name_pl bodyPart target equipment gifUrl')
      .exec();
  }

  /**
   * Zwraca jedno, pełne ćwiczenie (wraz z instrukcjami) - bez zmian
   */
  async findOne(id: string): Promise<ExerciseDocument> {
    const exercise = await this.exerciseModel.findById(id).exec();
    if (!exercise) {
      throw new NotFoundException(`Nie znaleziono ćwiczenia o ID ${id}`);
    }
    return exercise;
  }

  /**
   * Zwraca listę wszystkich unikalnych partii ciała - bez zmian
   */
  async findAllBodyParts(): Promise<string[]> {
    return this.exerciseModel.distinct('bodyPart');
  }

  /**
   * 🎯 NOWA (ZAKTUALIZOWANA) METODA DLA GENERATORA PLANÓW V6.0
   * Znajduje WSZYSTKIE ćwiczenia pasujące do podanego filtra MongoDB.
   * Zwraca pełne dokumenty Mongoose.
   */
  async findExercisesByFilter(
    filter: FilterQuery<ExerciseDocument>,
    limit: number = 1350,
  ): Promise<ExerciseDocument[]> {
    this.logger.log(
      `Finding exercises with filter: ${JSON.stringify(filter)}, limit: ${limit}`,
    );

    const exercises = await this.exerciseModel.find(filter).limit(limit).exec();

    if (!exercises || exercises.length === 0) {
      this.logger.warn(
        `Nie znaleziono ćwiczeń dla filtra: ${JSON.stringify(filter)}`,
      );
      return [];
    }

    this.logger.log(
      `Znaleziono ${exercises.length} ćwiczeń pasujących do filtra.`,
    );
    return exercises;
  }


  async createExerciseFromSwap(swapExercise: SwapExerciseData): Promise<ExerciseDocument> {
    const newExercise = new this.exerciseModel({
      apiId: swapExercise.apiId,
      name: swapExercise.name,
      name_pl: swapExercise.name_pl,
      bodyPart: swapExercise.bodyPart,
      target: swapExercise.target,
      equipment: swapExercise.equipment,
      gifUrl: swapExercise.gifUrl,
      secondaryMuscles: swapExercise.secondaryMuscles || [],
      instructions: swapExercise.instructions || [],
     
      difficulty: 5, 
      role: 'accessory', // Domyślnie akcesoria
      pattern: 'other', // Będzie trzeba ręcznie zaktualizować
    });

    const savedExercise = await newExercise.save();
    this.logger.log(
      `✅ Dodano nowe ćwiczenie do Golden List: ${savedExercise.name_pl}`,
    );

    return savedExercise;
  }
}
