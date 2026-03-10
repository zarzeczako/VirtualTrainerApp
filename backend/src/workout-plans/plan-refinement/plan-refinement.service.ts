// src/workout-plans/plan-refinement/plan-refinement.service.ts
import { Injectable, Logger } from '@nestjs/common';
// 🎯 POPRAWKA: Poprawna ścieżka (o jeden poziom wyżej)
import { WorkoutDay, PlanExercise } from '../schemas/workout-plan.schema';
import {
  Exercise,
  ExerciseDocument,
  ExerciseRole,
  ExercisePattern,
} from 'src/exercises/schemas/exercise.schema';
import { RecommendationService } from 'src/recommendations/recommendations.service';
import { Model, Types } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';

// Typy pomocnicze
type PopulatedPlanExercise = PlanExercise & {
  exercise: ExerciseDocument | null;
};
type PopulatedWorkoutDay = WorkoutDay & { exercises: PopulatedPlanExercise[] };

@Injectable()
export class PlanRefinementService {
  private readonly logger = new Logger(PlanRefinementService.name);

  constructor(
    @InjectModel(Exercise.name)
    private readonly exerciseModel: Model<ExerciseDocument>,
    private recommendationService: RecommendationService,
  ) {}

  async refinePlan(days: WorkoutDay[]): Promise<WorkoutDay[]> {
    this.logger.log(
      `[Recenzent AI] Uruchamiam Recenzenta dla ${days.length} dni...`,
    );

    const populatedDays = await this.populateDays(days);

  
    let sortedDays = populatedDays.map((day) => {
      if (!day || !day.exercises) return day;
      const sortedExercises = this.sortExercisesByDifficulty(day.exercises);
      return { ...day, exercises: sortedExercises };
    });
    this.logger.log('[Recenzent AI] Zakończono sortowanie ćwiczeń.');

    // Krok 2: Ocena i auto-rebalansowanie planu (max 3 próby)
    const MAX_REBALANCE_ATTEMPTS = 3;
    let attempt = 0;
    let needsRebalancing = true;

    while (needsRebalancing && attempt < MAX_REBALANCE_ATTEMPTS) {
      attempt++;
      const evaluation = this.evaluatePlanQuality(sortedDays);

      if (evaluation.pushPullRatio >= 0.7 && evaluation.pushPullRatio <= 1.43) {

        needsRebalancing = false;
        this.logger.log(
          `[Recenzent AI] ✅ Balans Push/Pull jest prawidłowy (ratio: ${evaluation.pushPullRatio.toFixed(2)})`,
        );
      } else {
        this.logger.warn(
          `[Recenzent AI] ⚠️ Próba ${attempt}/${MAX_REBALANCE_ATTEMPTS}: Niezbalansowany stosunek Push/Pull (${evaluation.pushPullRatio.toFixed(2)}). Wykonuję rebalansowanie...`,
        );
        sortedDays = await this.rebalancePlan(sortedDays, evaluation);
      }
    }

    if (attempt >= MAX_REBALANCE_ATTEMPTS && needsRebalancing) {
      this.logger.warn(
        `[Recenzent AI] ⚠️ Nie udało się osiągnąć idealnego balansu po ${MAX_REBALANCE_ATTEMPTS} próbach. Plan zostanie zapisany w obecnej formie.`,
      );
    }

    // Krok Ostatni: Depopulacja
    const dePopulatedDays = this.dePopulateDays(sortedDays);
    return dePopulatedDays;
  }

  private async populateDays(
    days: WorkoutDay[],
  ): Promise<PopulatedWorkoutDay[]> {
    try {
      const populatedDaysPromises = days.map(async (day) => {
        const populatedExercisesPromises = day.exercises.map(async (planEx) => {
          const exerciseDoc = await this.exerciseModel
            .findById(planEx.exercise)
            .exec();

          return {
            _id: planEx._id,
            exercise: exerciseDoc,
            name: planEx.name,
            name_pl: planEx.name_pl,
            sets: planEx.sets,
            reps: planEx.reps,
            notes: planEx.notes,
          } as PopulatedPlanExercise;
        });
        const populatedExercises = await Promise.all(
          populatedExercisesPromises,
        );
        // 🎯 POPRAWKA: Zwracamy obiekt bez używania ._doc
        return {
          _id: day._id,
          name: day.name,
          exercises: populatedExercises,
        } as PopulatedWorkoutDay;
      });
      return await Promise.all(populatedDaysPromises);
    } catch (error) {
      this.logger.error('Błąd podczas populacji dni w Recenzencie AI:', error);
      // Zwracamy puste dni w razie błędu
      return days.map((day) => ({
        _id: day._id,
        name: day.name,
        exercises: [],
      })) as PopulatedWorkoutDay[];
    }
  }

  private dePopulateDays(days: PopulatedWorkoutDay[]): WorkoutDay[] {
    return days.map((day) => {
      const dePopulatedExercises = day.exercises.map((popEx) => {
        const exerciseId =
          popEx.exercise &&
          typeof popEx.exercise === 'object' &&
          '_id' in popEx.exercise
            ? ((popEx.exercise as any)._id as Types.ObjectId)
            : (popEx.exercise as Types.ObjectId); 
        const newPlanEx: PlanExercise = {
          _id: popEx._id,
          exercise: exerciseId,
          name: popEx.name,
          name_pl: popEx.name_pl,
          sets: popEx.sets,
          reps: popEx.reps,
          notes: popEx.notes,
        };
        return newPlanEx;
      });
      const newDay: WorkoutDay = {
        _id: day._id,
        name: day.name,
        exercises: dePopulatedExercises,
      };
      return newDay;
    });
  }

  private sortExercisesByDifficulty(
    exercises: PopulatedPlanExercise[],
  ): PopulatedPlanExercise[] {
    return [...exercises].sort((a, b) => {
      const exerciseA = a.exercise;
      const exerciseB = b.exercise;
      if (!exerciseA && !exerciseB) return 0;
      if (!exerciseA) return 1;
      if (!exerciseB) return -1;
      const difficultyA = this.estimateSortDifficulty(exerciseA);
      const difficultyB = this.estimateSortDifficulty(exerciseB);
      return difficultyB - difficultyA;
    });
  }

  private estimateSortDifficulty(exercise: ExerciseDocument): number {
    if (!exercise) return 0;
    let score = exercise.difficulty || 5;
    if (exercise.role === ExerciseRole.MAIN_T1) score += 10;
    if (exercise.role === ExerciseRole.MAIN_T2) score += 5;
    if (exercise.role === ExerciseRole.ACCESSORY) score += 2;
    return score;
  }

  /**
   * Ocena jakości planu treningowego pod kątem:
   * 1. Balansu Push/Pull
   * 2. Objętości treningowej (liczba setów)
   * 3. Różnorodności ćwiczeń (podobieństwo kosinusowe)
   */
  private evaluatePlanQuality(days: PopulatedWorkoutDay[]): {
    pushPullRatio: number;
    totalPushSets: number;
    totalPullSets: number;
    totalVolume: number;
    avgDiversity: number;
  } {
    this.logger.log('[Recenzent AI] Rozpoczynam ocenę jakości planu...');

    let totalPushSets = 0;
    let totalPullSets = 0;
    let totalVolume = 0;
    const allExercises: ExerciseDocument[] = [];

    // Zbieranie statystyk
    for (const day of days) {
      for (const planEx of day.exercises) {
        if (!planEx.exercise) continue;

        const exercise = planEx.exercise;
        allExercises.push(exercise);
        totalVolume += planEx.sets;

        // Zliczanie Push/Pull dla oceny balansu
        if (exercise.pattern === 'push_h' || exercise.pattern === 'push_v') {
          totalPushSets += planEx.sets;
        } else if (
          exercise.pattern === 'pull_h' ||
          exercise.pattern === 'pull_v'
        ) {
          totalPullSets += planEx.sets;
        }
      }
    }

    // 1. Ocena balansu Push/Pull
    const pushPullRatio = totalPullSets > 0 ? totalPushSets / totalPullSets : 0;
    if (pushPullRatio < 0.7 || pushPullRatio > 1.43) {
      this.logger.warn(
        `[Recenzent AI] ⚠️ Niezbalansowany stosunek Push/Pull: ${totalPushSets} push / ${totalPullSets} pull (ratio: ${pushPullRatio.toFixed(2)}). Idealny zakres: 0.7-1.43`,
      );
    } else {
      this.logger.log(
        `[Recenzent AI] ✅ Dobry balans Push/Pull: ${totalPushSets} push / ${totalPullSets} pull (ratio: ${pushPullRatio.toFixed(2)})`,
      );
    }

    // 2. Ocena objętości treningowej
    const avgSetsPerDay = totalVolume / days.length;
    this.logger.log(
      `[Recenzent AI] 📊 Objętość treningowa: ${totalVolume} setów (średnio ${avgSetsPerDay.toFixed(1)} setów/dzień)`,
    );

    if (avgSetsPerDay < 10) {
      this.logger.warn(
        `[Recenzent AI] ⚠️ Niska objętość treningowa (<10 setów/dzień)`,
      );
    } else if (avgSetsPerDay > 30) {
      this.logger.warn(
        `[Recenzent AI] ⚠️ Bardzo wysoka objętość treningowa (>30 setów/dzień) - ryzyko przetrenowania`,
      );
    }

    // 3. Ocena różnorodności (podobieństwo kosinusowe)
    let avgDiversity = 0;
    if (allExercises.length > 1) {
      let totalSimilarity = 0;
      let comparisonCount = 0;

      // Porównujemy pary ćwiczeń w każdym dniu
      for (const day of days) {
        const dayExercises = day.exercises
          .map((pe) => pe.exercise)
          .filter(
            (ex): ex is ExerciseDocument => ex !== null && ex !== undefined,
          );

        for (let i = 0; i < dayExercises.length - 1; i++) {
          for (let j = i + 1; j < dayExercises.length; j++) {
            const ex1 = dayExercises[i];
            const ex2 = dayExercises[j];

            if (ex1.apiId && ex2.apiId) {
              const diversity = this.calculateDiversity([ex1, ex2]);
              totalSimilarity += diversity;
              comparisonCount++;
            }
          }
        }
      }

      avgDiversity =
        comparisonCount > 0 ? totalSimilarity / comparisonCount : 1;

      if (avgDiversity < 0.3) {
        this.logger.log(
          `[Recenzent AI] ✅ Wysoka różnorodność ćwiczeń (średnie podobieństwo: ${(avgDiversity * 100).toFixed(1)}%)`,
        );
      } else if (avgDiversity > 0.7) {
        this.logger.warn(
          `[Recenzent AI] ⚠️ Niska różnorodność ćwiczeń (średnie podobieństwo: ${(avgDiversity * 100).toFixed(1)}%) - ćwiczenia są bardzo podobne`,
        );
      } else {
        this.logger.log(
          `[Recenzent AI] ✅ Dobra różnorodność ćwiczeń (średnie podobieństwo: ${(avgDiversity * 100).toFixed(1)}%)`,
        );
      }
    }

    this.logger.log('[Recenzent AI] Zakończono ocenę jakości planu.');

    return {
      pushPullRatio,
      totalPushSets,
      totalPullSets,
      totalVolume,
      avgDiversity,
    };
  }

  /**
   * Oblicza różnorodność między dwoma ćwiczeniami
   * Im niższa wartość, tym bardziej różne ćwiczenia (0 = całkowicie różne, 1 = identyczne)
   */
  private calculateDiversity(exercises: ExerciseDocument[]): number {
    if (exercises.length < 2) return 0;

    // Prosta heurystyka: sprawdzamy podobieństwo bodyPart, target, equipment
    const [ex1, ex2] = exercises;
    let similarity = 0;

    if (ex1.bodyPart === ex2.bodyPart) similarity += 0.4;
    if (ex1.target === ex2.target) similarity += 0.4;
    if (ex1.equipment === ex2.equipment) similarity += 0.2;

    return similarity;
  }

  /**
   * Automatyczne rebalansowanie planu treningowego
   * Zamienia ćwiczenia, aby osiągnąć lepszy balans Push/Pull (ratio >= 0.7)
   */
  private async rebalancePlan(
    days: PopulatedWorkoutDay[],
    evaluation: {
      pushPullRatio: number;
      totalPushSets: number;
      totalPullSets: number;
    },
  ): Promise<PopulatedWorkoutDay[]> {
    const needsMorePush = evaluation.pushPullRatio < 0.7; // Za mało push
    const needsMorePull = evaluation.pushPullRatio > 1.43; // Za mało pull (1/0.7 = 1.43)

    if (!needsMorePush && !needsMorePull) {
      return days; // Balans jest OK
    }

    this.logger.log(
      `[Recenzent AI] 🔄 Rebalansuję plan: potrzeba więcej ${needsMorePush ? 'PUSH' : 'PULL'} ćwiczeń...`,
    );

    // Szukamy ćwiczenia do zamiany (z nadmiaru) i zastępujemy je ćwiczeniem z deficytu
    const targetPattern = needsMorePush
      ? ['push_h', 'push_v']
      : ['pull_h', 'pull_v'];
    const sourcePattern = needsMorePush
      ? ['pull_h', 'pull_v']
      : ['push_h', 'push_v'];

    for (const day of days) {
      for (let i = 0; i < day.exercises.length; i++) {
        const planEx = day.exercises[i];
        const exercise = planEx.exercise;

        if (!exercise || !exercise.pattern) continue;

        // Sprawdzamy czy to ćwiczenie jest z nadmiaru (pull jeśli potrzeba push, lub odwrotnie)
        if (sourcePattern.includes(exercise.pattern)) {
          // Szukamy zamiennika z pożądanego wzorca
          const replacement = await this.findReplacementExercise(
            exercise,
            targetPattern as ExercisePattern[],
          );

          if (replacement) {
            this.logger.log(
              `[Recenzent AI] 🔄 Zamieniam "${exercise.name_pl}" (${exercise.pattern}) na "${replacement.name_pl}" (${replacement.pattern})`,
            );

            // Zamieniamy ćwiczenie
            day.exercises[i] = {
              ...planEx,
              exercise: replacement,
              name: replacement.name,
              name_pl: replacement.name_pl,
            };

            // Wychodzimy po pierwszej zamianie (jedna zamiana na iterację)
            return days;
          }
        }
      }
    }

    this.logger.warn(
      `[Recenzent AI] ⚠️ Nie znaleziono odpowiedniego ćwiczenia do zamiany.`,
    );
    return days;
  }

  /**
   * Znajduje ćwiczenie zastępcze z danego wzorca ruchu
   */
  private async findReplacementExercise(
    currentExercise: ExerciseDocument,
    targetPatterns: ExercisePattern[],
  ): Promise<ExerciseDocument | null> {
    try {
      // Szukamy ćwiczeń z pożądanego wzorca, podobnego poziomu trudności i sprzętu
      const candidates = await this.exerciseModel
        .find({
          pattern: { $in: targetPatterns },
          difficulty: {
            $gte: (currentExercise.difficulty || 5) - 2,
            $lte: (currentExercise.difficulty || 5) + 2,
          },
          equipment: currentExercise.equipment, // Preferujemy ten sam sprzęt
        })
        .limit(5)
        .exec();

      if (candidates.length > 0) {
        // Zwracamy pierwsze znalezione ćwiczenie (można ulepszyć używając podobieństwa kosinusowego)
        return candidates[0];
      }

      // Fallback: szukamy bez ograniczenia sprzętu
      const fallbackCandidates = await this.exerciseModel
        .find({
          pattern: { $in: targetPatterns },
          difficulty: {
            $gte: (currentExercise.difficulty || 5) - 3,
            $lte: (currentExercise.difficulty || 5) + 3,
          },
        })
        .limit(5)
        .exec();

      return fallbackCandidates.length > 0 ? fallbackCandidates[0] : null;
    } catch (error) {
      this.logger.error(
        `[Recenzent AI] Błąd podczas szukania zamiennika: ${error.message}`,
      );
      return null;
    }
  }
}
