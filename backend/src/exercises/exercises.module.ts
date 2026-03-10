// src/exercises/exercises.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Exercise, ExerciseSchema } from './schemas/exercise.schema';
import {
  SwapExercise,
  SwapExerciseSchema,
} from './schemas/swap-exercise.schema';
import { ExercisesController } from './exercises.controller';
import { ExercisesService } from './exercises.service';
import { SeederService } from './seeder.service';
import { SwapSeederService } from './swap-seeder.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Exercise.name, schema: ExerciseSchema },
      { name: SwapExercise.name, schema: SwapExerciseSchema },
    ]),
  ],
  controllers: [ExercisesController],
  providers: [ExercisesService, SeederService, SwapSeederService],
  exports: [ExercisesService, SeederService, SwapSeederService],
})
export class ExercisesModule {}
