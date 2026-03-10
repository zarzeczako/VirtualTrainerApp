import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isBlocked?: boolean;
}

export class AdminStatsDto {
  totalUsers: number;
  totalPlans: number;
  totalExercises: number;
  totalChatMessages: number;
  blockedUsers: number;
  activeUsers: number;
  plansCreatedThisWeek: number;
  chatQueriesThisWeek: number;
}
