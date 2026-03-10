import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { UpdateUserDto, AdminStatsDto } from './dto/admin.dto';
import { WorkoutPlan } from '../workout-plans/schemas/workout-plan.schema';
import { Exercise } from '../exercises/schemas/exercise.schema';
import { SwapExercise } from '../exercises/schemas/swap-exercise.schema';

@Injectable()
export class AdminService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(WorkoutPlan.name) private workoutPlanModel: Model<WorkoutPlan>,
    @InjectModel(Exercise.name) private exerciseModel: Model<Exercise>,
    @InjectModel(SwapExercise.name) private swapExerciseModel: Model<SwapExercise>,
  ) {}

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
    isBlocked?: boolean,
  ) {
    const query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (role) {
      query.role = role;
    }

    if (isBlocked !== undefined) {
      query.isBlocked = isBlocked;
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.userModel
        .find(query)
        .select('-password -resetPasswordToken')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(query),
    ]);

    return {
      users,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserById(id: string) {
    const user = await this.userModel
      .findById(id)
      .select('-password -resetPasswordToken')
      .exec();

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (dto.email && dto.email !== user.email) {
      const existingUser = await this.userModel.findOne({ email: dto.email });
      if (existingUser) {
        throw new BadRequestException('Email już istnieje');
      }
    }

    Object.assign(user, dto);
    await user.save();

    const { password, resetPasswordToken, ...result } = user.toObject();
    return result;
  }

  async deleteUser(id: string) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.role === 'admin') {
      throw new BadRequestException('Nie można usunąć konta administratora');
    }

    await this.userModel.findByIdAndDelete(id);
    return { message: 'Użytkownik został usunięty' };
  }

  async toggleBlockUser(id: string) {
    const user = await this.userModel.findById(id);

    if (!user) {
      throw new NotFoundException('Użytkownik nie znaleziony');
    }

    if (user.role === 'admin') {
      throw new BadRequestException('Nie można zablokować konta administratora');
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    return {
      isBlocked: user.isBlocked,
      message: user.isBlocked ? 'Użytkownik zablokowany' : 'Użytkownik odblokowany',
    };
  }

  async getStats(): Promise<AdminStatsDto> {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const [
      totalUsers,
      totalPlans,
      totalExercises,
      blockedUsers,
      plansCreatedThisWeek,
      activeUsers,
    ] = await Promise.all([
      this.userModel.countDocuments(),
      this.workoutPlanModel.countDocuments(),
      this.exerciseModel.countDocuments(),
      this.userModel.countDocuments({ isBlocked: true }),
      this.workoutPlanModel.countDocuments({
        createdAt: { $gte: oneWeekAgo },
      }),
      this.userModel.countDocuments({
        isBlocked: false,
        role: 'user',
      }),
    ]);

    return {
      totalUsers,
      totalPlans,
      totalExercises,
      totalChatMessages: 0, // To be implemented with chat history
      blockedUsers,
      activeUsers,
      plansCreatedThisWeek,
      chatQueriesThisWeek: 0, // To be implemented with chat history
    };
  }

  async getRecentActivity(limit: number = 10) {
    const recentUsers = await this.userModel
      .find()
      .select('email name createdAt role')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    const recentPlans = await this.workoutPlanModel
      .find()
      .populate('user', 'email name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();

    return {
      recentUsers,
      recentPlans,
    };
  }

  // Exercise Management Methods
  async getAllExercises(
    page: number = 1, 
    limit: number = 20, 
    search?: string,
    isGoldenList?: boolean
  ) {
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { name_pl: { $regex: search, $options: 'i' } },
        { bodyPart: { $regex: search, $options: 'i' } },
      ];
    }

    if (isGoldenList !== undefined) {
      query.isGoldenList = isGoldenList;
    }

    const skip = (page - 1) * limit;

    const [exercises, total] = await Promise.all([
      this.exerciseModel
        .find(query)
        .sort({ name_pl: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.exerciseModel.countDocuments(query),
    ]);

    return {
      data: exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Swap exercises (pełna baza exercises.json)
  async getAllSwapExercises(
    page: number = 1,
    limit: number = 20,
    search?: string,
  ) {
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { name_pl: { $regex: search, $options: 'i' } },
        { bodyPart: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;

    const [exercises, total] = await Promise.all([
      this.swapExerciseModel
        .find(query)
        .sort({ name_pl: 1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.swapExerciseModel.countDocuments(query),
    ]);

    return {
      data: exercises,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getExerciseById(id: string) {
    const exercise = await this.exerciseModel.findById(id).exec();
    if (!exercise) {
      throw new NotFoundException('Ćwiczenie nie znalezione');
    }
    return exercise;
  }

  async createExercise(exerciseData: any) {
    try {
      const exercise = new this.exerciseModel(exerciseData);
      return await exercise.save();
    } catch (error) {
      throw new BadRequestException('Nie udało się utworzyć ćwiczenia');
    }
  }

  async updateExercise(id: string, exerciseData: any) {
    const exercise = await this.exerciseModel
      .findByIdAndUpdate(id, exerciseData, { new: true })
      .exec();

    if (!exercise) {
      throw new NotFoundException('Ćwiczenie nie znalezione');
    }

    return exercise;
  }

  async deleteExercise(id: string) {
    const exercise = await this.exerciseModel.findByIdAndDelete(id).exec();
    if (!exercise) {
      throw new NotFoundException('Ćwiczenie nie znalezione');
    }
    return { message: 'Ćwiczenie zostało usunięte', exercise };
  }
}
