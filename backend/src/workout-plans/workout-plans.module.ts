// src/workout-plans/workout-plans.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkoutPlansController } from './workout-plans.controller';
import { WorkoutPlansService } from './workout-plans.service';
import { WorkoutPlan, WorkoutPlanSchema } from './schemas/workout-plan.schema';
import { PlanGeneratorService } from './plan-generator.service';
import { ExercisesModule } from 'src/exercises/exercises.module';
import { AuthModule } from 'src/auth/auth.module';
import { RecommendationsModule } from 'src/recommendations/recommendations.module';
import { PlanRefinementService } from './plan-refinement/plan-refinement.service'; // 🎯 1. IMPORTUJEMY SCHEMAT ĆWICZEŃ
import {
  Exercise,
  ExerciseSchema,
} from 'src/exercises/schemas/exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WorkoutPlan.name, schema: WorkoutPlanSchema },
      // 🎯 2. DODAJEMY IMPORT MODELU ĆWICZEŃ TUTAJ
      // To pozwoli wstrzyknąć 'ExerciseModel' do 'PlanRefinementService'
      { name: Exercise.name, schema: ExerciseSchema },
    ]),
    ExercisesModule, // Nadal potrzebne dla ExercisesService
    AuthModule,
    RecommendationsModule,
  ],
  controllers: [WorkoutPlansController],
  providers: [WorkoutPlansService, PlanGeneratorService, PlanRefinementService],
})
export class WorkoutPlansModule {}
