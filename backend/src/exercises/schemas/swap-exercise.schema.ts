// src/exercises/schemas/swap-exercise.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SwapExerciseDocument = SwapExercise & Document;

@Schema({ collection: 'swap_exercises' })
export class SwapExercise {
  @Prop({ required: true, unique: true })
  apiId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  name_pl: string;

  @Prop({ required: true })
  bodyPart: string;

  @Prop({ required: true })
  target: string;

  @Prop({ required: true })
  equipment: string;

  @Prop()
  gifUrl?: string;

  @Prop()
  secondaryMuscles?: string[];

  @Prop()
  instructions?: string[];

  @Prop()
  instructions_pl?: string[]; // <-- DODAJ TĘ LINIĘ
}

export const SwapExerciseSchema = SchemaFactory.createForClass(SwapExercise);
