// src/recommendations/recommendations.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RecommendationService } from './recommendations.service';
import {
  SwapExercise,
  SwapExerciseSchema,
} from 'src/exercises/schemas/swap-exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SwapExercise.name, schema: SwapExerciseSchema },
    ]),
  ],
  providers: [RecommendationService],
  exports: [RecommendationService],
})
export class RecommendationsModule {}
