// src/recommendations/recommendations.service.ts
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Exercise, ExerciseDocument } from 'src/exercises/schemas/exercise.schema';
import { SwapExercise, SwapExerciseDocument } from 'src/exercises/schemas/swap-exercise.schema';
import * as fs from 'fs';
import * as path from 'path';

interface SimilarityScore {
  exercise: SwapExerciseDocument;
  score: number;
}

@Injectable()
export class RecommendationService implements OnModuleInit {
  private readonly logger = new Logger(RecommendationService.name);

  private bodyPartVocab: string[] = [];
  private targetVocab: string[] = [];
  private equipmentVocab: string[] = [];
  private vectorMap = new Map<string, number[]>();

  constructor(
    @InjectModel(SwapExercise.name)
    private swapExerciseModel: Model<SwapExerciseDocument>,
  ) {}

  async onModuleInit() {
    await this.loadAndProcessExercises();
  }

  private async loadAndProcessExercises() {
    try {
      let allExercises: (SwapExerciseDocument | Partial<SwapExercise>)[] = await this
        .swapExerciseModel
        .find()
        .lean()
        .exec();

      if (!allExercises || allExercises.length === 0) {
        const fallbackExercises = this.loadFallbackExercisesFromFile();

        if (fallbackExercises.length === 0) {
          this.logger.error('[AI Swap Library] BŁĄD: Kolekcja swap_exercises jest pusta i brak fallbacku exercises.json!');
          return;
        }

        try {
          await this.swapExerciseModel.insertMany(fallbackExercises, { ordered: false });
          this.logger.warn(`[AI Swap Library] Kolekcja swap_exercises była pusta. Zasilono ${fallbackExercises.length} ćwiczeń z fallbacku exercises.json.`);
        } catch (seedErr) {
          this.logger.warn(`[AI Swap Library] Nie udało się zapisać fallbacku do bazy: ${seedErr.message}`);
        }

        allExercises = fallbackExercises;
      }

      this.rebuildVectorSpace(allExercises);
      this.logger.log(`[AI Swap Library] Załadowano ${allExercises.length} ćwiczeń do silnika rekomendacji (Smart Swap).`);
    } catch (err) {
      this.logger.error('[AI Swap Library] Nie udało się załadować danych z bazy swap_exercises!', err.stack);
    }
  }

  private rebuildVectorSpace(exercises: any[]) {
    const bodyParts = new Set(exercises.map(e => e.bodyPart).filter(Boolean));
    const targets = new Set(exercises.map(e => e.target).filter(Boolean));
    const equipments = new Set(exercises.map(e => e.equipment).filter(Boolean));

    this.bodyPartVocab = Array.from(bodyParts);
    this.targetVocab = Array.from(targets);
    this.equipmentVocab = Array.from(equipments);
    this.vectorMap = new Map();

    for (const exercise of exercises) {
      if (exercise.apiId) {
        this.vectorMap.set(exercise.apiId, this.createVector(exercise));
      }
    }
  }

  private loadFallbackExercisesFromFile(): Partial<SwapExercise>[] {
    try {
      const filePath = path.join(process.cwd(), 'data', 'exercises.json');
      if (!fs.existsSync(filePath)) {
        this.logger.error(`[AI Swap Library] Nie znaleziono fallbacku exercises.json (${filePath}).`);
        return [];
      }

      const rawData = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(rawData);

      if (!Array.isArray(parsed) || parsed.length === 0) {
        this.logger.error('[AI Swap Library] Plik exercises.json jest pusty lub uszkodzony.');
        return [];
      }

      return parsed
        .filter((ex) => ex && (ex.apiId || ex.id))
        .map((ex) => ({
          apiId: ex.apiId ?? ex.id,
          name: ex.name,
          name_pl: ex.name_pl ?? ex.name,
          bodyPart: ex.bodyPart,
          target: ex.target,
          equipment: ex.equipment,
          gifUrl: ex.gifUrl,
          secondaryMuscles: ex.secondaryMuscles ?? [],
          instructions: ex.instructions ?? [],
          instructions_pl: ex.instructions_pl ?? ex.instructions ?? [],
        }));
    } catch (error) {
      this.logger.error('[AI Swap Library] Nie udało się odczytać fallbacku exercises.json', error.stack);
      return [];
    }
  }

  private createVector(exercise: any): number[] {
    const bodyPartVector = this.bodyPartVocab.map((bp) =>
      bp === exercise.bodyPart ? 1 : 0,
    );
    const targetVector = this.targetVocab.map((t) =>
      t === exercise.target ? 1 : 0,
    );
    const equipmentVector = this.equipmentVocab.map((eq) =>
      eq === exercise.equipment ? 1 : 0,
    );
    return [...bodyPartVector, ...targetVector, ...equipmentVector];
  }

  private dotProduct(vecA: number[], vecB: number[]): number {
    return vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
  }

  private magnitude(vec: number[]): number {
    return Math.sqrt(vec.reduce((sum, val) => sum + val * val, 0));
  }

  private getCosineSimilarity(apiIdA: string, apiIdB: string): number {
    const vecA = this.vectorMap.get(apiIdA);
    const vecB = this.vectorMap.get(apiIdB);
    if (!vecA || !vecB) return 0;
    const magA = this.magnitude(vecA);
    const magB = this.magnitude(vecB);
    const dot = this.dotProduct(vecA, vecB);
    if (magA === 0 || magB === 0) return 0;
    return dot / (magA * magB);
  }

  public async getSimilarExercises(apiId: string, n: number): Promise<any[]> {
    if (!this.vectorMap.has(apiId)) {
      this.logger.warn(`[AI Swap] Nie znaleziono wektora dla apiId: ${apiId}`);
      return [];
    }

    const allSwapExercises = await this.swapExerciseModel.find().lean().exec();

    const scores: any[] = allSwapExercises
      .map((ex) => ({
        exercise: ex,
        score: this.getCosineSimilarity(apiId, ex.apiId),
      }))
      .filter((ex) => ex.exercise.apiId !== apiId);

    scores.sort((a, b) => b.score - a.score);

    return scores.slice(0, n).map((s) => s.exercise);
  }

  public getMostDiverseExercise<T extends Exercise | ExerciseDocument>(
    candidatePool: T[],
    chosenExercises: T[],
  ): T | null {
    if (!candidatePool || candidatePool.length === 0) {
      return null;
    }

    let bestCandidate: T | null = null;
    let lowestMaxSimilarity = Infinity;

    for (const candidate of candidatePool) {
      const candidateApiId = (candidate as any).apiId;
      if (!candidateApiId) continue;

      let maxSimilarity = 0;

      for (const chosen of chosenExercises) {
        const chosenApiId = (chosen as any).apiId;
        if (!chosenApiId) continue;

        const similarity = this.getCosineSimilarity(
          candidateApiId,
          chosenApiId,
        );
        if (similarity > maxSimilarity) maxSimilarity = similarity;
      }
      if (maxSimilarity < lowestMaxSimilarity) {
        lowestMaxSimilarity = maxSimilarity;
        bestCandidate = candidate;
      }
    }
    return bestCandidate || candidatePool[0];
  }
}

