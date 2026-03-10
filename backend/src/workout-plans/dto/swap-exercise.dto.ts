// src/workout-plans/dto/swap-exercise.dto.ts
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class SwapExerciseDto {
  @IsNotEmpty()
  @IsMongoId()
  planId: string; // ID całego planu

  @IsNotEmpty()
  @IsMongoId()
  dayId: string; // ID dnia, w którym jest ćwiczenie

  @IsNotEmpty()
  @IsMongoId()
  exerciseToSwapId: string; // ID ćwiczenia (z PlanExercise), które chcemy podmienić
}
