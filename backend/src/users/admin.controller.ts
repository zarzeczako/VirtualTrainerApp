import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import { AdminGuard } from '../auth/admin.guard';
import { AdminService } from './admin.service';
import { UpdateUserDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('activity')
  async getRecentActivity(@Query('limit') limit?: string) {
    return this.adminService.getRecentActivity(limit ? parseInt(limit) : 10);
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isBlocked') isBlocked?: string,
  ) {
    return this.adminService.getAllUsers(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      role,
      isBlocked === 'true' ? true : isBlocked === 'false' ? false : undefined,
    );
  }

  @Get('users/:id')
  async getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Put('users/:id')
  async updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.adminService.updateUser(id, dto);
  }

  @Delete('users/:id')
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Put('users/:id/toggle-block')
  async toggleBlockUser(@Param('id') id: string) {
    return this.adminService.toggleBlockUser(id);
  }

  // Exercise Management
  @Get('exercises')
  async getAllExercises(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('isGoldenList') isGoldenList?: string,
  ) {
    return this.adminService.getAllExercises(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
      isGoldenList === 'true' ? true : isGoldenList === 'false' ? false : undefined,
    );
  }

  @Get('exercises/:id')
  async getExerciseById(@Param('id') id: string) {
    return this.adminService.getExerciseById(id);
  }

  // Swap exercises (pełna baza exercises.json)
  @Get('swap-exercises')
  async getAllSwapExercises(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.adminService.getAllSwapExercises(
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      search,
    );
  }

  @Post('exercises')
  async createExercise(@Body() exerciseData: any) {
    return this.adminService.createExercise(exerciseData);
  }

  @Put('exercises/:id')
  async updateExercise(@Param('id') id: string, @Body() exerciseData: any) {
    return this.adminService.updateExercise(id, exerciseData);
  }

  @Delete('exercises/:id')
  async deleteExercise(@Param('id') id: string) {
    return this.adminService.deleteExercise(id);
  }
}
