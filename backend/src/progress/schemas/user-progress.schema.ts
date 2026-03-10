import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type WeightEntry = {
  date: string;
  weight: number;
};

export type StrengthTrainingEntry = {
  date: string;
  weight: number;
  reps: number;
};

export type StrengthExerciseEntry = {
  exercise: string;
  entries: StrengthTrainingEntry[];
};

@Schema({ timestamps: true })
export class UserProgress {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    type: [
      {
        date: { type: String, required: true },
        weight: { type: Number, required: true },
      },
    ],
    default: [],
  })
  weightEntries: WeightEntry[];

  @Prop({
    type: [
      {
        exercise: { type: String, required: true },
        entries: [
          {
            date: { type: String, required: true },
            weight: { type: Number, required: true },
            reps: { type: Number, required: true },
          },
        ],
      },
    ],
    default: [],
  })
  strengthEntries: StrengthExerciseEntry[];
}

export type UserProgressDocument = HydratedDocument<UserProgress>;
export const UserProgressSchema = SchemaFactory.createForClass(UserProgress);
