// src/workout-plans/schemas/workout-plan.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { User } from 'src/users/schema/user.schema';
import {
  Exercise,
  ExerciseDocument,
} from 'src/exercises/schemas/exercise.schema';

export type WorkoutPlanDocument = WorkoutPlan & Document;

// 🎯 POPRAWKA: Mówimy TS, że Mongoose doda _id
@Schema({ _id: true, versionKey: false })
export class PlanExercise {
  @Prop()
  _id: Types.ObjectId; // Jawna definicja dla TypeScript

  @Prop({ type: Types.ObjectId, ref: 'Exercise', required: true })
  exercise: Types.ObjectId | ExerciseDocument; // Może być ID lub spopulowany

  @Prop({ required: true })
  name: string; // Nazwa angielska ćwiczenia

  @Prop({ required: true })
  name_pl: string; // Nazwa polska ćwiczenia

  @Prop({ required: true })
  sets: number;
  @Prop({ required: true })
  reps: string;
  @Prop({ required: false })
  notes?: string;
}
export const PlanExerciseSchema = SchemaFactory.createForClass(PlanExercise);

// 🎯 POPRAWKA: Mówimy TS, że Mongoose doda _id
@Schema({ _id: true, versionKey: false })
export class WorkoutDay {
  @Prop()
  _id: Types.ObjectId; // Jawna definicja dla TypeScript

  @Prop({ required: true })
  name: string;
  @Prop({ type: [PlanExerciseSchema], default: [] })
  exercises: PlanExercise[];
}
export const WorkoutDaySchema = SchemaFactory.createForClass(WorkoutDay);

// Główny schemat
@Schema({ timestamps: true })
export class WorkoutPlan {
  @Prop({ required: true })
  name: string;
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  user: Types.ObjectId | User;
  @Prop({ required: true })
  description: string;
  @Prop({ required: false, default: 3 })
  daysPerWeek: number;
  @Prop({ required: true, index: true })
  level: string;
  @Prop({ required: true, index: true })
  goal: string;
  @Prop({ required: false, index: true, default: 'gym' })
  equipmentPreset: string; // 'body-weight', 'free-weight', 'gym' (domyślnie 'gym' dla starych planów)
  @Prop({ default: false, index: true })
  isActive: boolean;
  @Prop({ type: [WorkoutDaySchema], default: [] })
  days: WorkoutDay[];
}
export const WorkoutPlanSchema = SchemaFactory.createForClass(WorkoutPlan);
