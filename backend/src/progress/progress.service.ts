import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  WorkoutPlan,
  WorkoutPlanDocument,
  WorkoutDay,
  PlanExercise,
} from 'src/workout-plans/schemas/workout-plan.schema';
import { Exercise } from 'src/exercises/schemas/exercise.schema';
import {
  StrengthTrainingEntry,
  UserProgress,
  UserProgressDocument,
  WeightEntry,
} from './schemas/user-progress.schema';
import { User, UserDocument } from 'src/users/schema/user.schema';

const MOVING_AVERAGE_WINDOW = 3;
const CONFIDENCE_Z_SCORE = 1.96;
const PREDICTION_HORIZONS = [1, 3, 6] as const;
const IDEAL_VOLUME_PER_GROUP = 12;

type PredictionHorizon = (typeof PREDICTION_HORIZONS)[number];

type PopulatedPlanExercise = PlanExercise & { exercise?: Exercise };
type PopulatedWorkoutDay = WorkoutDay & { exercises: PopulatedPlanExercise[] };
type PopulatedWorkoutPlan = WorkoutPlan & { days: PopulatedWorkoutDay[] };

type StrengthExerciseGroup = {
  exercise: string;
  entries: StrengthTrainingEntry[];
};

type RegressionInputPoint = { x: number; y: number; weight: number };

type RegressionResult = {
  slope: number;
  intercept: number;
  standardError: number;
  meanX: number;
  sumSquaredDiff: number;
  totalWeight: number;
};

export interface BmiEntry {
  date: string;
  value: number;
}

export interface StrengthPoint {
  date: string;
  value: number;
}

export interface StrengthPredictionPoint extends StrengthPoint {
  lowerBound: number;
  upperBound: number;
}

export interface StrengthStat {
  exercise: string;
  history: StrengthPoint[];
  movingAverage: StrengthPoint[];
  predictions: Record<PredictionHorizon, StrengthPredictionPoint[]>;
}

export interface ProgressStatsResponse {
  currentBMI: number;
  bmiHistory: BmiEntry[];
  strengthStats: StrengthStat[];
  muscleDistribution: MuscleDistributionEntry[];
  hasActivePlan: boolean;
}

export interface AddStrengthEntryPayload {
  exercise: string;
  weight: number;
  date: string;
  reps?: number;
  force?: boolean;
}

export interface UpdateWeightPayload {
  weight: number;
  date?: string;
}

export interface UpdateWeightResponse {
  currentBMI: number;
  bmiHistory: BmiEntry[];
}

export interface MuscleDistributionEntry {
  subject: string;
  A: number;
  B: number;
}

@Injectable()
export class ProgressService {
  constructor(
    @InjectModel(WorkoutPlan.name)
    private readonly workoutPlanModel: Model<WorkoutPlanDocument>,
    @InjectModel(UserProgress.name)
    private readonly userProgressModel: Model<UserProgressDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  private readonly fallbackHeightInMeters = 1.78;

  private readonly muscleGroupsOrder = [
    'Klatka piersiowa',
    'Plecy',
    'Nogi',
    'Barki',
    'Ręce',
    'Core',
    'Inne',
  ];

  async getProgressStats(userId?: string): Promise<ProgressStatsResponse> {
    if (!userId) {
      return this.buildEmptyStats();
    }

    const objectId = this.toObjectId(userId);
    const progressDoc = await this.userProgressModel
      .findOne({ userId: objectId })
      .lean<UserProgress>()
      .exec();

    const heightInMeters = await this.resolveUserHeightInMeters(objectId);
    const weightEntries = progressDoc?.weightEntries ?? [];
    const bmiHistory = this.computeBmiHistory(weightEntries, heightInMeters);

    const strengthStats = this.buildStrengthStats(
      progressDoc?.strengthEntries ?? [],
    );

    const { data: muscleDistribution, hasActivePlan } =
      await this.computeMuscleDistributionFromActivePlan(userId);

    const currentBMI = bmiHistory.at(-1)?.value ?? 0;

    return {
      currentBMI: Number(currentBMI.toFixed(1)),
      bmiHistory,
      strengthStats,
      muscleDistribution,
      hasActivePlan,
    };
  }

  async addStrengthEntry(
    payload: AddStrengthEntryPayload,
    userId?: string,
  ): Promise<StrengthStat> {
    if (!userId) {
      throw new BadRequestException('Brak użytkownika. Zaloguj się ponownie.');
    }

    const objectId = this.toObjectId(userId);
    const progress = await this.getOrCreateProgress(objectId);
    const reps = payload.reps ?? 1;

    const normalizedExercise = payload.exercise.trim();
    if (!normalizedExercise) {
      throw new BadRequestException('Nazwa ćwiczenia jest wymagana.');
    }

    let group = progress.strengthEntries.find(
      (entry) => entry.exercise === normalizedExercise,
    );

    if (!group) {
      group = { exercise: normalizedExercise, entries: [] };
      progress.strengthEntries.push(group as StrengthExerciseGroup);
    }

    if (group.entries.length) {
      const lastEntry = group.entries[group.entries.length - 1];
      const previousMax = this.calculateOneRepMax(
        lastEntry.weight,
        lastEntry.reps,
      );
      const incomingMax = this.calculateOneRepMax(payload.weight, reps);
      if (previousMax > 0) {
        const deviation = Math.abs(incomingMax - previousMax) / previousMax;
        if (deviation > 0.2 && !payload.force) {
          throw new ConflictException('Anomaly detected');
        }
      }
    }

    group.entries.push({ date: payload.date, weight: payload.weight, reps });
    group.entries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    await progress.save();

    return this.buildStrengthStat(group.exercise, group.entries);
  }

  async updateWeight(
    payload: UpdateWeightPayload,
    userId?: string,
  ): Promise<UpdateWeightResponse> {
    if (!userId) {
      throw new BadRequestException('Brak użytkownika. Zaloguj się ponownie.');
    }

    const objectId = this.toObjectId(userId);
    const progress = await this.getOrCreateProgress(objectId);

    const entry: WeightEntry = {
      date: payload.date ?? new Date().toISOString().split('T')[0],
      weight: payload.weight,
    };

    progress.weightEntries.push(entry);
    progress.weightEntries.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );

    await progress.save();

    const heightInMeters = await this.resolveUserHeightInMeters(objectId);
    const bmiHistory = this.computeBmiHistory(
      progress.weightEntries,
      heightInMeters,
    );
    const currentBMI = bmiHistory.at(-1)?.value ?? 0;

    return {
      currentBMI: Number(currentBMI.toFixed(1)),
      bmiHistory,
    };
  }

  async seedMockDataForUser(userId?: string): Promise<ProgressStatsResponse> {
    if (!userId) {
      throw new BadRequestException('Brak użytkownika. Zaloguj się ponownie.');
    }

    const objectId = this.toObjectId(userId);

    const demoWeightEntries: WeightEntry[] = [
      { date: '2025-07-01', weight: 82 },
      { date: '2025-08-01', weight: 81.2 },
      { date: '2025-09-01', weight: 80.5 },
      { date: '2025-10-01', weight: 79.8 },
      { date: '2025-11-01', weight: 79.1 },
    ];

    const demoStrengthEntries: StrengthExerciseGroup[] = [
      {
        exercise: 'Martwy ciąg',
        entries: [
          { date: '2025-07-01', weight: 110, reps: 5 },
          { date: '2025-08-01', weight: 115, reps: 4 },
          { date: '2025-09-01', weight: 120, reps: 3 },
          { date: '2025-10-01', weight: 122.5, reps: 3 },
        ],
      },
      {
        exercise: 'Wyciskanie leżąc',
        entries: [
          { date: '2025-07-01', weight: 82.5, reps: 5 },
          { date: '2025-08-01', weight: 85, reps: 4 },
          { date: '2025-09-01', weight: 87.5, reps: 4 },
          { date: '2025-10-01', weight: 90, reps: 3 },
        ],
      },
      {
        exercise: 'Przysiad',
        entries: [
          { date: '2025-07-01', weight: 105, reps: 5 },
          { date: '2025-08-01', weight: 110, reps: 4 },
          { date: '2025-09-01', weight: 115, reps: 4 },
          { date: '2025-10-01', weight: 117.5, reps: 3 },
        ],
      },
    ];

    await this.userProgressModel
      .findOneAndUpdate(
        { userId: objectId },
        {
          $set: {
            weightEntries: demoWeightEntries,
            strengthEntries: demoStrengthEntries,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      )
      .exec();

    return this.getProgressStats(userId);
  }

  private buildEmptyStats(): ProgressStatsResponse {
    return {
      currentBMI: 0,
      bmiHistory: [],
      strengthStats: [],
      muscleDistribution: [],
      hasActivePlan: false,
    };
  }

  private computeBmiHistory(
    weightHistory: WeightEntry[],
    heightInMeters: number,
  ): BmiEntry[] {
    if (!weightHistory.length) {
      return [];
    }
// Mapowanie historii wagi na historię BMI (Waga / Wzrost^2)
    return weightHistory.map(({ date, weight }) => ({
      date,
      value: Number((weight / (heightInMeters * heightInMeters)).toFixed(1)),
    }));
  }

  private buildStrengthStats(entries: StrengthExerciseGroup[]): StrengthStat[] {
    if (!entries.length) {
      return [];
    }

    return entries.map((group) =>
      this.buildStrengthStat(group.exercise, group.entries),
    );
  }

  private buildStrengthStat(
    exercise: string,
    entries: StrengthTrainingEntry[],
  ): StrengthStat {
    const history = entries.map(({ date, weight, reps }) => ({
      date,
      value: Number(this.calculateOneRepMax(weight, reps).toFixed(1)),
    }));

    const movingAverage = this.computeMovingAverage(history);
    const cleanedHistory = this.removeOutliers(history);
    const predictions = this.generatePredictions(history, cleanedHistory);

    return { exercise, history, movingAverage, predictions };
  }

  private async getOrCreateProgress(
    userId: Types.ObjectId,
  ): Promise<UserProgressDocument> {
    const existing = await this.userProgressModel
      .findOne({ userId })
      .exec();

    if (existing) {
      return existing;
    }

    return this.userProgressModel.create({ userId });
  }

  private async resolveUserHeightInMeters(
    userId: Types.ObjectId,
  ): Promise<number> {
    const user = await this.userModel.findById(userId).lean<User>().exec();
    if (user?.heightCm && user.heightCm > 0) {
      return user.heightCm / 100;
    }

    return this.fallbackHeightInMeters;
  }

  private toObjectId(id: string): Types.ObjectId {
    return new Types.ObjectId(id);
  }

  private calculateOneRepMax(weight: number, reps?: number): number {
    const normalizedWeight = Number.isFinite(weight) ? Math.max(weight, 0) : 0;
    const normalizedReps = Number.isFinite(reps ?? 1) ? Math.max(reps ?? 1, 1) : 1;

    if (normalizedWeight === 0) {
      return 0;
    }

    if (normalizedReps === 1) {
      return normalizedWeight;
    }

    return normalizedWeight * (1 + normalizedReps / 30);
  }

  private computeMovingAverage(points: StrengthPoint[]): StrengthPoint[] {
    if (!points.length) {
      return [];
    }

    return points.map((point, index) => {
      const windowStart = Math.max(0, index - MOVING_AVERAGE_WINDOW + 1);
      const windowSlice = points.slice(windowStart, index + 1);
      const average =
        windowSlice.reduce((sum, entry) => sum + entry.value, 0) /
        windowSlice.length;
      return { date: point.date, value: Number(average.toFixed(1)) };
    });
  }

  private removeOutliers(points: StrengthPoint[]): StrengthPoint[] {
    if (points.length < 4) {
      return points;
    }

    const sortedValues = [...points.map((point) => point.value)].sort(
      (a, b) => a - b,
    );
    const q1 = this.getQuartile(sortedValues, 0.25);
    const q3 = this.getQuartile(sortedValues, 0.75);
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    return points.filter(
      (point) => point.value >= lowerBound && point.value <= upperBound,
    );
  }

  private getQuartile(sortedValues: number[], percentile: number): number {
    const position = (sortedValues.length - 1) * percentile;
    const base = Math.floor(position);
    const rest = position - base;

    if (sortedValues[base + 1] !== undefined) {
      return (
        sortedValues[base] + rest * (sortedValues[base + 1] - sortedValues[base])
      );
    }
    return sortedValues[base];
  }

  private generatePredictions(
    originalHistory: StrengthPoint[],
    filteredHistory: StrengthPoint[],
  ): Record<PredictionHorizon, StrengthPredictionPoint[]> {
    const predictions = PREDICTION_HORIZONS.reduce(
      (acc, horizon) => {
        acc[horizon] = [];
        return acc;
      },
      {} as Record<PredictionHorizon, StrengthPredictionPoint[]>,
    );

    if (filteredHistory.length < 2 || originalHistory.length === 0) {
      return predictions;
    }

    const regressionInput: RegressionInputPoint[] = filteredHistory.map(
      (point, index) => ({
        x: index + 1,
        y: point.value,
        weight: Math.pow(index + 1, 2),
      }),
    );

    const {
      slope,
      intercept,
      standardError,
      meanX,
      sumSquaredDiff,
      totalWeight,
    } = this.weightedLinearRegression(regressionInput);

    const lastDate = new Date(originalHistory[originalHistory.length - 1].date);

    PREDICTION_HORIZONS.forEach((months) => {
      const horizonPoints: StrengthPredictionPoint[] = [];
      for (let offset = 1; offset <= months; offset += 1) {
        const x = filteredHistory.length + offset;
        const predictedValue = slope * x + intercept;

        const predictionVariance =
          1 + 1 / Math.max(totalWeight, 1) +
          Math.pow(x - meanX, 2) / sumSquaredDiff;
        const standardErrorForPoint = standardError * Math.sqrt(predictionVariance);
        const margin =
          Math.abs(standardErrorForPoint * CONFIDENCE_Z_SCORE) || 0;

        const baseDate = this.addMonths(lastDate, offset);
        const upperBound = Number((predictedValue + margin).toFixed(1));
        const lowerBound = Number(Math.max(predictedValue - margin, 0).toFixed(1));

        horizonPoints.push({
          date: baseDate,
          value: Number(predictedValue.toFixed(1)),
          lowerBound,
          upperBound,
        });
      }
      predictions[months] = horizonPoints;
    });

    return predictions;
  }

  private weightedLinearRegression(
    points: RegressionInputPoint[],
  ): RegressionResult {
    const totalWeight =
      points.reduce((acc, point) => acc + point.weight, 0) || 1;
    const sumWX = points.reduce(
      (acc, point) => acc + point.weight * point.x,
      0,
    );
    const sumWY = points.reduce(
      (acc, point) => acc + point.weight * point.y,
      0,
    );
    const sumWXY = points.reduce(
      (acc, point) => acc + point.weight * point.x * point.y,
      0,
    );
    const sumWX2 = points.reduce(
      (acc, point) => acc + point.weight * point.x * point.x,
      0,
    );

    const denominator = totalWeight * sumWX2 - sumWX * sumWX || 1;

    const slope = (totalWeight * sumWXY - sumWX * sumWY) / denominator;
    const intercept = (sumWY - slope * sumWX) / totalWeight;

    const residualSum = points.reduce((acc, point) => {
      const predicted = slope * point.x + intercept;
      return acc + point.weight * Math.pow(point.y - predicted, 2);
    }, 0);

    const effectiveDof = Math.max(totalWeight - 2, 1);
    const standardError = Math.sqrt(residualSum / effectiveDof);

    const meanX = sumWX / totalWeight;
    const sumSquaredDiff =
      points.reduce(
        (acc, point) => acc + point.weight * Math.pow(point.x - meanX, 2),
        0,
      ) || 1;

    return {
      slope,
      intercept,
      standardError,
      meanX,
      sumSquaredDiff,
      totalWeight,
    };
  }

  async deleteExerciseHistory(
    exerciseName: string,
    userId?: string,
  ): Promise<ProgressStatsResponse> {
    if (!userId) {
      throw new BadRequestException('Brak użytkownika. Zaloguj się ponownie.');
    }

    const normalizedExercise = exerciseName?.trim();
    if (!normalizedExercise) {
      throw new BadRequestException('Nazwa ćwiczenia jest wymagana.');
    }

    const objectId = this.toObjectId(userId);

    await this.userProgressModel
      .updateOne(
        { userId: objectId },
        { $pull: { strengthEntries: { exercise: normalizedExercise } } },
      )
      .exec();

    return this.getProgressStats(userId);
  }

  private async computeMuscleDistributionFromActivePlan(
    userId?: string,
  ): Promise<{ hasActivePlan: boolean; data: MuscleDistributionEntry[] }> {
    if (!userId) {
      return { hasActivePlan: false, data: [] };
    }

    const activePlan = await this.workoutPlanModel
      .findOne({ user: new Types.ObjectId(userId), isActive: true })
      .populate({
        path: 'days.exercises.exercise',
        model: 'Exercise',
        select: 'bodyPart name name_pl',
      })
      .lean<PopulatedWorkoutPlan>()
      .exec();

    if (!activePlan) {
      return { hasActivePlan: false, data: [] };
    }

    const totals: Record<string, number> = {};

    activePlan.days.forEach((day) => {
      day.exercises.forEach((planExercise) => {
        const exerciseDoc = planExercise.exercise as Exercise | undefined;
        if (!exerciseDoc?.bodyPart) {
          return;
        }

        const group = this.mapBodyPartToGroup(exerciseDoc.bodyPart);
        totals[group] = (totals[group] ?? 0) + 1;
      });
    });

    // Filter out "Inne" if it has 0 count
    const visibleGroups = this.muscleGroupsOrder.filter((group) => {
      if (group === 'Inne' && (totals[group] ?? 0) === 0) {
        return false;
      }
      return true;
    });

    const idealValue = Number((100 / visibleGroups.length).toFixed(1));

    const data = visibleGroups.map((group) => {
      const count = totals[group] ?? 0;
      const saturation = count / IDEAL_VOLUME_PER_GROUP;
      const normalizedScore = Math.min(100, Math.round(saturation * 100));
      return {
        subject: group,
        A: normalizedScore,
        B: idealValue,
      };
    });

    return { hasActivePlan: true, data };
  }

  private mapBodyPartToGroup(bodyPart: string): string {
    const normalized = bodyPart.toLowerCase();

    if (normalized.includes('chest') || normalized.includes('pect')) {
      return 'Klatka piersiowa';
    }
    if (
      normalized.includes('back') ||
      normalized.includes('lat') ||
      normalized.includes('trap') ||
      normalized.includes('dorsi')
    ) {
      return 'Plecy';
    }
    if (
      normalized.includes('leg') ||
      normalized.includes('quad') ||
      normalized.includes('glute') ||
      normalized.includes('hamstring') ||
      normalized.includes('thigh')
    ) {
      return 'Nogi';
    }
    if (normalized.includes('shoulder') || normalized.includes('delto')) {
      return 'Barki';
    }
    if (
      normalized.includes('arm') ||
      normalized.includes('bicep') ||
      normalized.includes('tricep') ||
      normalized.includes('forearm')
    ) {
      return 'Ręce';
    }
    if (
      normalized.includes('core') ||
      normalized.includes('ab') ||
      normalized.includes('waist') ||
      normalized.includes('oblique')
    ) {
      return 'Core';
    }
    return 'Inne';
  }

  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().split('T')[0];
  }
}

