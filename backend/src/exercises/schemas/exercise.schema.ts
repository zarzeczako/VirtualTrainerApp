import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExerciseDocument = Exercise & Document;

export enum ExerciseRole {
  MAIN_T1 = 'main_t1',
  MAIN_T2 = 'main_t2',
  ACCESSORY = 'accessory',
  ISOLATION = 'isolation',
  CORE = 'core',
  OTHER = 'other',
}
export enum ExercisePattern {
  PUSH_H = 'push_h',
  PUSH_V = 'push_v',
  PULL_H = 'pull_h',
  PULL_V = 'pull_v',
  QUAD = 'quad',
  HINGE = 'hinge',
  ARM_FLEXION = 'arm_flexion',
  ARM_EXTENSION = 'arm_extension',
  ISOLATION = 'isolation',
  CORE = 'core',
  OTHER = 'other',
}
// Możemy dodać 'plane' później, na razie upraszczamy
// export enum ExercisePlane { /* ... */ }

@Schema({ timestamps: true })
export class Exercise {
  @Prop({ required: true, unique: true }) apiId: string;
  @Prop({ required: true, index: true }) name: string;
  @Prop({ required: true, index: true }) name_pl: string;
  @Prop({ required: true, index: true }) bodyPart: string;
  @Prop({ required: true }) target: string;
  @Prop({ required: true }) equipment: string;
  @Prop({ required: false }) gifUrl?: string;
  @Prop([String]) instructions: string[];
  @Prop([String]) instructions_pl: string[];

  // --- Pola V6.0 ---
  @Prop({
    type: String,
    enum: Object.values(ExerciseRole),
    required: false,
    default: ExerciseRole.ACCESSORY,
    index: true,
  })
  role: ExerciseRole;
  @Prop({
    type: String,
    enum: Object.values(ExercisePattern),
    required: false,
    default: ExercisePattern.OTHER,
    index: true,
  })
  pattern: ExercisePattern;
  @Prop({
    type: Number,
    min: 0,
    max: 10,
    required: true,
    default: 5,
    index: true,
  })
  difficulty: number;
  @Prop({ type: Boolean, default: false })
  is_unilateral: boolean;
  @Prop({ type: Boolean, default: false, index: true })
  isGoldenList: boolean; // Oznacza czy ćwiczenie jest w Złotej Liście
}
export const ExerciseSchema = SchemaFactory.createForClass(Exercise);
ExerciseSchema.index({ equipment: 1, role: 1, pattern: 1, difficulty: 1 });
