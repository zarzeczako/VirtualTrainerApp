// src/dialogflow/dialogflow.module.ts
import { Module } from '@nestjs/common';
import { DialogflowController } from './dialogflow.controller';
import { DialogflowService } from './dialogflow.service';
import { ExercisesModule } from '../exercises/exercises.module';
import { MongooseModule } from '@nestjs/mongoose';
// Zmieniamy importy na SwapExercise
import {
  SwapExercise,
  SwapExerciseSchema,
} from '../exercises/schemas/swap-exercise.schema';

@Module({
  imports: [
    ExercisesModule,
    // Używamy modelu SwapExercise
    MongooseModule.forFeature([
      { name: SwapExercise.name, schema: SwapExerciseSchema },
    ]),
  ],
  controllers: [DialogflowController],
  providers: [DialogflowService],
})
export class DialogflowModule {}
