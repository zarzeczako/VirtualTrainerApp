import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Exercise, ExerciseDocument } from './schemas/exercise.schema';
import * as fs from 'fs';
import * as path from 'path';
// C:\Users\micha\Desktop\Wszystko\WirtualnyTrener-develop\backend\src\exercises\seeder.service.ts
// Interfejs dla "brudnego" obiektu z pliku EJSON
interface EjsonExercise {
  _id: { $oid: string }; // Kluczowy problem
  apiId: string;
  name: string;
  name_pl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  role: string; // Zakładamy, że już tu są
  pattern: string;
  difficulty: number;
  is_unilateral: boolean;
  instructions: string[];
  instructions_pl: string[];
  createdAt: { $date: string }; // Kluczowy problem
  updatedAt: { $date: string }; // Kluczowy problem
  __v?: number;
}

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);
  // Golden List jest jedynym źródłem dla kolekcji exercises
  private readonly GOLDEN_LIST_PATH = path.join(
    process.cwd(),
    'data/golden_list_final.json',
  );

  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
  ) {}

  async onModuleInit() {
    this.logger.log('Uruchomiono SeederService...');
    // Nie wywołujemy seedExercises() automatycznie przy każdym starcie
    // Wywołamy go ręcznie przez main.ts
  }

  async seedExercises(force: boolean = false) {
    const count = await this.exerciseModel.countDocuments().exec();
    if (count > 0 && !force) {
      this.logger.log(
        `Kolekcja 'exercises' zawiera już ${count} dokumentów. Pomijam zasilanie.`,
      );
      return;
    }

    if (force && count > 0) {
      this.logger.warn(
        `FORCE MODE: Usuwam ${count} istniejących ćwiczeń przed ponownym zasilaniem...`,
      );
      await this.exerciseModel.deleteMany({}).exec();
    }

    this.logger.warn(
      `Kolekcja 'exercises' jest PUSTA. Rozpoczynam zasilanie danymi z Golden List...`,
    );

    try {
      if (!fs.existsSync(this.GOLDEN_LIST_PATH)) {
        this.logger.error(
          `BŁĄD: Nie znaleziono pliku Golden List w ${this.GOLDEN_LIST_PATH}`,
        );
        return;
      }

      const rawData = fs.readFileSync(this.GOLDEN_LIST_PATH, 'utf-8');
      const ejsonExercises: EjsonExercise[] = JSON.parse(rawData);

      if (!ejsonExercises || ejsonExercises.length === 0) {
        this.logger.error('BŁĄD: Plik ćwiczeń jest pusty lub uszkodzony.');
        return;
      }

      this.logger.log(
        `Wczytano ${ejsonExercises.length} ćwiczeń. Rozpoczynam "czyszczenie" EJSON...`,
      );

      // 🎯 KROK CZYSZCZENIA EJSON
      // Tworzymy nową tablicę "czystych" obiektów, zgodnych z naszym schematem
      const cleanExercises = ejsonExercises.map((ejsonEx) => {
        // Pomijamy _id, createdAt, updatedAt (Mongoose doda je sam)
        const { _id, createdAt, updatedAt, __v, ...rest } = ejsonEx;

        // Zwracamy tylko te dane, które definiuje nasz Schemat Exercise
        return {
          ...rest,
          // Upewniamy się, że mamy wszystkie wymagane pola
          apiId: ejsonEx.apiId,
          name: ejsonEx.name,
          name_pl: ejsonEx.name_pl,
          bodyPart: ejsonEx.bodyPart,
          target: ejsonEx.target,
          equipment: ejsonEx.equipment,
          instructions: ejsonEx.instructions,
          instructions_pl: ejsonEx.instructions_pl,
          // Golden List zawiera własne role/pattern; fallback na sensowne wartości
          role: ejsonEx.role || 'accessory',
          pattern: ejsonEx.pattern || 'other',
          difficulty: ejsonEx.difficulty || 5,
          is_unilateral: ejsonEx.is_unilateral || false,
          isGoldenList: true, // Cała kolekcja exercises = Golden List
        };
      });

      this.logger.log(
        `Wstawiam ${cleanExercises.length} ćwiczeń z Golden List do kolekcji exercises...`,
      );
      await this.exerciseModel.insertMany(cleanExercises);

      this.logger.log(
        `--- SUKCES! --- Baza danych została pomyślnie zasilona ${cleanExercises.length} ćwiczeniami.`,
      );
    } catch (error) {
      this.logger.error('Krytyczny błąd podczas zasilania bazą ćwiczeń:', error);
    }
  }
}
