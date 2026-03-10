import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { CreateUserData } from './interfaces/user.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  private sanitizeUser(
    doc: UserDocument | (Partial<User> & { _id?: unknown }) | null,
  ): Omit<User, 'password'> | null {
    if (!doc) return null;
    const plain =
      typeof (doc as UserDocument).toObject === 'function'
        ? ((doc as UserDocument).toObject() as Partial<User>)
        : (doc as Partial<User>);
    if (plain && 'password' in plain) {
      delete (plain as Partial<User> & { password?: string }).password;
    }
    return plain as Omit<User, 'password'>;
  }

  // read-only: return list without password
  async findAll(): Promise<Array<Omit<User, 'password'>>> {
    const users = await this.userModel.find().select('-password').lean().exec();
    return users
      .map((user) => this.sanitizeUser(user as Omit<User, 'password'>))
      .filter((user): user is Omit<User, 'password'> => Boolean(user));
  }

  async findOne(id: string): Promise<Omit<User, 'password'>> {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('User not found');
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .lean()
      .exec();
    if (!user) throw new NotFoundException('User not found');
    const result = this.sanitizeUser(user as Omit<User, 'password'>);
    if (!result) throw new NotFoundException('User not found');
    return result;
  }

  // Safe lookup that returns null when not found (used by auth/jwt strategy)
  async findByIdSafe(id: string): Promise<Omit<User, 'password'> | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .lean()
      .exec();
    return this.sanitizeUser(user as Omit<User, 'password'>);
  }

  // Return user document including password when needed for auth
  // Note: returning full Mongoose document type so password and _id types are preserved
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select('+password').exec();
  }

  // create new user (returns sanitized user without password)
  async create(data: CreateUserData): Promise<Omit<User, 'password'>> {
    const created = await this.userModel.create(data);
    const sanitized = this.sanitizeUser(created);
    if (!sanitized) throw new NotFoundException('User not created');
    return sanitized;
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'password'>> {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');

    const updatePayload: Record<string, unknown> = {};
    const simpleFields: Array<keyof UpdateProfileDto> = [
      'firstName',
      'lastName',
      'name',
      'city',
      'goal',
      'experienceLevel',
      'weightKg',
      'heightCm',
      'workoutsPerWeekTarget',
      'bio',
      'themePreference',
    ];

    simpleFields.forEach((field) => {
      if (dto[field] !== undefined) {
        updatePayload[field] = dto[field];
      }
    });

    if (dto.birthDate !== undefined) {
      updatePayload.birthDate = dto.birthDate
        ? new Date(dto.birthDate)
        : null;
    }

    if (dto.avatarDataUrl) {
      updatePayload.avatarUrl = dto.avatarDataUrl;
    } else if (dto.avatarUrl !== undefined) {
      updatePayload.avatarUrl = dto.avatarUrl;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: updatePayload }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('User not found');

    const sanitized = this.sanitizeUser(updated as Omit<User, 'password'>);
    if (!sanitized) throw new NotFoundException('User not found');
    return sanitized;
  }

  async updateEmail(
    userId: string,
    dto: UpdateEmailDto,
  ): Promise<Omit<User, 'password'>> {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');

    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    if (!user.password)
      throw new BadRequestException('User has no password set');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Invalid password');

    const normalizedEmail = dto.newEmail.toLowerCase();
    if (user.email === normalizedEmail)
      throw new BadRequestException('Email unchanged');

    const duplicate = await this.userModel
      .findOne({ email: normalizedEmail })
      .select('_id')
      .lean()
      .exec();

    if (duplicate) throw new ConflictException('Email already in use');

    user.email = normalizedEmail;
    await user.save();

    const sanitized = this.sanitizeUser(user);
    if (!sanitized) throw new NotFoundException('User not found');
    return sanitized;
  }

  async updatePassword(
    userId: string,
    dto: UpdatePasswordDto,
  ): Promise<{ ok: true }> {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');

    const user = await this.userModel
      .findById(userId)
      .select('+password')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    if (!user.password)
      throw new BadRequestException('User has no password set');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Invalid password');

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    user.password = hashed;
    await user.save();

    return { ok: true };
  }

  // set hashed password for existing user (useful for migration)
  async setPasswordByEmail(
    email: string,
    hashedPassword: string,
  ): Promise<void> {
    const res = await this.userModel
      .updateOne({ email }, { $set: { password: hashedPassword } })
      .exec();
    // Mongoose UpdateResult shape differs between drivers; check both matchedCount and modifiedCount for compatibility
    const matched = (res as any).matchedCount ?? (res as any).n ?? 0;
    if (matched === 0) throw new NotFoundException('User not found');
  }

  // OAuth methods
  async findByProviderId(
    provider: string,
    providerId: string,
  ): Promise<UserDocument | null> {
    return this.userModel.findOne({ provider, providerId }).exec();
  }

  async linkOAuthProvider(
    email: string,
    provider: string,
    providerId: string,
  ): Promise<void> {
    await this.userModel
      .updateOne({ email }, { $set: { provider, providerId } })
      .exec();
  }

  // Password reset methods
  async setResetPasswordToken(
    email: string,
    hashedToken: string,
    expires: Date,
  ): Promise<void> {
    await this.userModel
      .updateOne(
        { email },
        { $set: { resetPasswordToken: hashedToken, resetPasswordExpires: expires } },
      )
      .exec();
  }

  async findByResetToken(): Promise<UserDocument | null> {
    return this.userModel
      .findOne({
        resetPasswordToken: { $exists: true },
        resetPasswordExpires: { $gte: new Date() },
      })
      .exec();
  }

  async resetPassword(email: string, hashedPassword: string): Promise<void> {
    await this.userModel
      .updateOne(
        { email },
        {
          $set: { password: hashedPassword },
          $unset: { resetPasswordToken: '', resetPasswordExpires: '' },
        },
      )
      .exec();
  }

  // Complete onboarding survey
  async completeOnboarding(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Omit<User, 'password'>> {
    if (!Types.ObjectId.isValid(userId))
      throw new NotFoundException('User not found');

    const updatePayload: Record<string, unknown> = {
      onboardingCompleted: true,
    };

    const simpleFields: Array<keyof UpdateProfileDto> = [
      'firstName',
      'lastName',
      'name',
      'city',
      'goal',
      'experienceLevel',
      'weightKg',
      'heightCm',
      'workoutsPerWeekTarget',
      'bio',
    ];

    simpleFields.forEach((field) => {
      if (dto[field] !== undefined) {
        updatePayload[field] = dto[field];
      }
    });

    if (dto.birthDate !== undefined) {
      updatePayload.birthDate = dto.birthDate
        ? new Date(dto.birthDate)
        : null;
    }

    const updated = await this.userModel
      .findByIdAndUpdate(userId, { $set: updatePayload }, { new: true })
      .select('-password')
      .lean()
      .exec();

    if (!updated) throw new NotFoundException('User not found');

    const sanitized = this.sanitizeUser(updated as Omit<User, 'password'>);
    if (!sanitized) throw new NotFoundException('User not found');
    return sanitized;
  }
}
