// src/exercises/swap-seeder.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SwapExercise,
  SwapExerciseDocument,
} from './schemas/swap-exercise.schema';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SwapSeederService implements OnModuleInit {
  private readonly logger = new Logger(SwapSeederService.name);

  constructor(
    @InjectModel(SwapExercise.name)
    private swapExerciseModel: Model<SwapExerciseDocument>,
  ) {}

  async onModuleInit() {
    await this.seedSwapExercises();
  }

  private async seedSwapExercises() {
    try {
      const count = await this.swapExerciseModel.countDocuments().exec();

      if (count > 0) {
        this.logger.log(
          `[Swap Library] Baza już zawiera ${count} ćwiczeń. Pomijam seedowanie.`,
        );
        return;
      }

      const filePath = path.join(process.cwd(), 'data/exercises.json');

      if (!fs.existsSync(filePath)) {
        this.logger.error(
          `[Swap Library] BŁĄD: Nie znaleziono pliku data/exercises.json!`,
        );
        return;
      }

      const fileContent = fs.readFileSync(filePath, 'utf-8');
      const exercisesData = JSON.parse(fileContent);

      if (!Array.isArray(exercisesData) || exercisesData.length === 0) {
        this.logger.error(
          '[Swap Library] Plik exercises.json jest pusty lub nieprawidłowy!',
        );
        return;
      }

      this.logger.log(
        `[Swap Library] Wczytuję ${exercisesData.length} ćwiczeń z exercises.json...`,
      );

      // Konwertujemy dane do formatu SwapExercise
      const swapExercises = exercisesData.map((ex) => ({
        apiId: ex.id || ex.apiId,
        name: ex.name,
        name_pl: ex.name_pl || ex.name, // Fallback jeśli brak tłumaczenia
        bodyPart: ex.bodyPart,
        target: ex.target,
        equipment: ex.equipment,
        gifUrl: ex.gifUrl,
        secondaryMuscles: ex.secondaryMuscles || [],
        instructions: ex.instructions || [],
        instructions_pl: ex.instructions_pl || ex.instructions || [],
      }));

      await this.swapExerciseModel.insertMany(swapExercises, {
        ordered: false,
      });

      const finalCount = await this.swapExerciseModel.countDocuments().exec();
      this.logger.log(
        `✅ [Swap Library] Załadowano ${finalCount} ćwiczeń do kolekcji swap_exercises.`,
      );
    } catch (error) {
      this.logger.error(
        '[Swap Library] Błąd podczas seedowania:',
        error.message,
      );
    }
  }
}
