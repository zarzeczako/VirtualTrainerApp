import { Document } from 'mongoose';

export interface ExerciseFilter {
  bodyPart?: string | { $in: string[] };
  equipment?: string | { $in: string[] };
  target?: string | { $in: string[] };
  difficulty?: number | { $lte?: number; $gte?: number };
  role?: string | { $in: string[] };
}

export interface SwapExerciseData {
  apiId: string;
  name: string;
  name_pl: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl: string;
  secondaryMuscles?: string[];
  instructions?: string[];
}

export interface ExerciseSearchParams {
  bodyPart?: string;
  equipment?: string;
  target?: string;
  name?: string;
  limit?: number;
}
