import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProgressService } from './progress.service';
import type {
  AddStrengthEntryPayload,
  ProgressStatsResponse,
  StrengthStat,
  UpdateWeightPayload,
  UpdateWeightResponse,
} from './progress.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get('stats')
  getProgressStats(@Request() req): Promise<ProgressStatsResponse> {
    return this.progressService.getProgressStats(this.extractUserId(req));
  }

  @Post('add-entry')
  addStrengthEntry(
    @Body() payload: AddStrengthEntryPayload,
    @Request() req,
  ): Promise<StrengthStat> {
    return this.progressService.addStrengthEntry(
      payload,
      this.extractUserId(req),
    );
  }

  @Post('update-weight')
  updateWeight(
    @Body() payload: UpdateWeightPayload,
    @Request() req,
  ): Promise<UpdateWeightResponse> {
    return this.progressService.updateWeight(payload, this.extractUserId(req));
  }

  @Post('seed-mock')
  seedMock(@Request() req): Promise<ProgressStatsResponse> {
    return this.progressService.seedMockDataForUser(
      this.extractUserId(req),
    );
  }

  @Delete('history')
  deleteHistory(
    @Query('exerciseName') exerciseName: string,
    @Request() req,
  ): Promise<ProgressStatsResponse> {
    return this.progressService.deleteExerciseHistory(
      exerciseName,
      this.extractUserId(req),
    );
  }

  private extractUserId(request: { user?: { userId?: string; _id?: string } }) {
    return request?.user?.userId ?? request?.user?._id;
  }
}
