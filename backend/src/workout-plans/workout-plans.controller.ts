// src/workout-plans/workout-plans.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
  // 🎯 POPRAWKA: USUNIĘTO ParseMongoIdPipe stąd
} from '@nestjs/common';
import { WorkoutPlansService } from './workout-plans.service';
import { GeneratePlanDto } from './dto/generate-plan.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { PlanGeneratorService } from './plan-generator.service';
import { ParseMongoIdPipe } from 'src/common/pipes/parse-mongo-id.pipe'; // 🎯 POPRAWKA: Importujemy TYLKO STĄD
import { SwapExerciseDto } from './dto/swap-exercise.dto';
import { Types } from 'mongoose';

@UseGuards(JwtAuthGuard)
@Controller('workout-plans')
export class WorkoutPlansController {
  constructor(
    private readonly workoutPlansService: WorkoutPlansService,
    private readonly planGeneratorService: PlanGeneratorService,
  ) {}

  @Post('generate')
  generatePlan(@Body() generatePlanDto: GeneratePlanDto, @Request() req) {
    return this.planGeneratorService.generatePlan(generatePlanDto, req.user);
  }

  @Post('swap-exercise')
  swapExercise(@Body() swapExerciseDto: SwapExerciseDto, @Request() req) {
    return this.workoutPlansService.swapExercise(swapExerciseDto, req.user._id);
  }

  @Get()
  findAllForUser(@Request() req) {
    return this.workoutPlansService.findAllForUser(req.user._id);
  }

  @Get(':id')
  findOne(@Param('id', ParseMongoIdPipe) id: Types.ObjectId, @Request() req) {
    return this.workoutPlansService.findOne(id.toHexString(), req.user._id);
  }

  @Delete(':id')
  remove(@Param('id', ParseMongoIdPipe) id: Types.ObjectId, @Request() req) {
    return this.workoutPlansService.remove(id.toHexString(), req.user._id);
  }

  @Patch(':id/activate')
  setActive(@Param('id', ParseMongoIdPipe) id: Types.ObjectId, @Request() req) {
    return this.workoutPlansService.setActivePlan(
      id.toHexString(),
      req.user._id,
    );
  }
}
