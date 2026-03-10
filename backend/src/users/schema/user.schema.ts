import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: false, trim: true })
  name?: string;

  @Prop({ trim: true })
  firstName?: string;

  @Prop({ trim: true })
  lastName?: string;

  @Prop({ trim: true })
  city?: string;

  @Prop({ trim: true })
  goal?: string;

  @Prop({ trim: true })
  experienceLevel?: string;

  @Prop({ type: Number, min: 0 })
  weightKg?: number;

  @Prop({ type: Number, min: 0 })
  heightCm?: number;

  @Prop({ type: Number, min: 0 })
  workoutsPerWeekTarget?: number;

  @Prop({ trim: true })
  themePreference?: string;

  @Prop({ trim: true })
  avatarUrl?: string;

  @Prop({ trim: true })
  avatarBackground?: string;

  @Prop({ trim: true })
  bio?: string;

  @Prop({ type: Date })
  birthDate?: Date;

  // hashed password (optional for OAuth users)
  @Prop({ required: false })
  password?: string;

  // User role (user or admin)
  @Prop({ required: true, default: 'user', enum: ['user', 'admin'] })
  role: string;

  // Account status
  @Prop({ type: Boolean, default: false })
  isBlocked: boolean;

  // OAuth fields
  @Prop({ required: false })
  provider?: string; // 'local', 'google', 'facebook'

  @Prop({ required: false })
  providerId?: string; // ID from OAuth provider

  // Password reset token
  @Prop({ required: false })
  resetPasswordToken?: string;

  @Prop({ type: Date, required: false })
  resetPasswordExpires?: Date;

  // Onboarding survey completion status
  @Prop({ type: Boolean, default: false })
  onboardingCompleted: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
