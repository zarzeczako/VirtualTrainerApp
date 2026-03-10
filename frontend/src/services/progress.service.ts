import http from './http';

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

export type PredictionHorizon = 1 | 3 | 6;

export interface StrengthStat {
  exercise: string;
  history: StrengthPoint[];
  movingAverage: StrengthPoint[];
  predictions: Record<PredictionHorizon, StrengthPredictionPoint[]>;
}

export interface MuscleDistributionEntry {
  subject: string;
  A: number;
  B: number;
}

export interface ProgressStatsResponse {
  currentBMI: number;
  bmiHistory: BmiEntry[];
  strengthStats: StrengthStat[];
  muscleDistribution: MuscleDistributionEntry[];
  hasActivePlan: boolean;
}

export interface AddEntryPayload {
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

export const progressService = {
  async fetchStats(): Promise<ProgressStatsResponse> {
    const { data } = await http.get<ProgressStatsResponse>('/progress/stats');
    return data;
  },
  async addEntry(payload: AddEntryPayload): Promise<StrengthStat> {
    const { data } = await http.post<StrengthStat>('/progress/add-entry', payload);
    return data;
  },
  async updateWeight(payload: UpdateWeightPayload): Promise<UpdateWeightResponse> {
    const { data } = await http.post<UpdateWeightResponse>(
      '/progress/update-weight',
      payload,
    );
    return data;
  },
  async seedMockData(): Promise<ProgressStatsResponse> {
    const { data } = await http.post<ProgressStatsResponse>('/progress/seed-mock', {});
    return data;
  },
  async resetExerciseHistory(exerciseName: string): Promise<ProgressStatsResponse> {
    const { data } = await http.delete<ProgressStatsResponse>('/progress/history', {
      params: { exerciseName },
    });
    return data;
  },
};
