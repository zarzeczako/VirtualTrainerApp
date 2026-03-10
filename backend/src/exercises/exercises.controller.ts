// src/exercises/exercises.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ExercisesService } from './exercises.service';

@Controller('exercises') // Endpointy będą pod /api/exercises
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Get()
  findAll() {
    return this.exercisesService.findAll();
  }

  @Get('swap')
  findAllSwap() {
    return this.exercisesService.findAllSwap();
  }

  @Get('swap/:id')
  findOneSwap(@Param('id') id: string) {
    return this.exercisesService.findOneSwap(id);
  }

  @Get('swap/bodypart/:part')
  findSwapByBodyPart(@Param('part') part: string) {
    return this.exercisesService.findSwapByBodyPart(part);
  }

  @Get('bodyparts')
  findAllBodyParts() {
    return this.exercisesService.findAllBodyParts();
  }

  @Get('bodypart/:part')
  findByBodyPart(@Param('part') part: string) {
    return this.exercisesService.findByBodyPart(part);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.exercisesService.findOne(id);
  }
}
