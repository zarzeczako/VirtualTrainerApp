import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminSeederService } from './admin-seeder.service';
import { User, UserSchema } from './schema/user.schema';
import { WorkoutPlan, WorkoutPlanSchema } from '../workout-plans/schemas/workout-plan.schema';
import { Exercise, ExerciseSchema } from '../exercises/schemas/exercise.schema';
import { SwapExercise, SwapExerciseSchema } from '../exercises/schemas/swap-exercise.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: WorkoutPlan.name, schema: WorkoutPlanSchema },
      { name: Exercise.name, schema: ExerciseSchema },
      { name: SwapExercise.name, schema: SwapExerciseSchema },
    ]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') || 'default_secret_for_dev',
        signOptions: { expiresIn: '7d' },
      }),
    }),
  ],
  controllers: [UsersController, AdminController],
  providers: [UsersService, AdminService, AdminSeederService],
  exports: [UsersService, AdminSeederService],
})
export class UsersModule {}
