import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { RegisterUserDto } from '../users/dto/register-user.dto';
import { LoginDto } from '../users/dto/login.dto';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schema/user.schema';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import { OAuthProfile, TokenResponse, OAuthResponse } from './interfaces/auth.interface';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  // Register: create new user document with hashed password
  async register(dto: RegisterUserDto): Promise<{
    email: string;
    name?: string;
    _id?: unknown;
  }> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const created = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      password: hashed,
    });

    return created;
  }

  async login(dto: LoginDto): Promise<TokenResponse> {
    const user = (await this.usersService.findByEmail(
      dto.email,
    )) as UserDocument | null;
    if (!user) throw new UnauthorizedException('Błędne logowanie. Spróbuj ponownie');
    if (user.isBlocked) throw new UnauthorizedException('Twoje konto zostało zablokowane');
    if (!user.password)
      throw new BadRequestException('Użytkownik nie ma ustawionego hasła');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Błędne logowanie. Spróbuj ponownie');

    const subject = typeof user._id === 'string' ? user._id : String(user._id);
    const payload = { sub: subject, email: user.email };
    const access_token = await this.jwtService.signAsync(payload, {
      jwtid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    return { access_token };
  }

  // set password for existing user that has no password
  async setPasswordForExistingUser(
    email: string,
    newPassword: string,
  ): Promise<{ ok: true }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) throw new BadRequestException('User not found');
    if (user.password)
      throw new BadRequestException('User already has a password');

    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.setPasswordByEmail(email, hashed);
    return { ok: true };
  }

  // OAuth login/register
  async validateOAuthLogin(profile: OAuthProfile): Promise<OAuthResponse> {
    let user: UserDocument | null = await this.usersService.findByProviderId(
      profile.provider,
      profile.providerId,
    );

    if (!user) {
      // Check if user exists with this email
      const existingUser = await this.usersService.findByEmail(profile.email);
      if (existingUser) {
        // Link OAuth to existing account
        await this.usersService.linkOAuthProvider(
          existingUser.email,
          profile.provider,
          profile.providerId,
        );
        user = existingUser;
      } else {
        // Create new user - returns sanitized user, need to fetch full document
        const created = await this.usersService.create({
          email: profile.email,
          firstName: profile.firstName,
          lastName: profile.lastName,
          avatarUrl: profile.avatarUrl,
          provider: profile.provider,
          providerId: profile.providerId,
        });
        // Fetch full user document with _id
        user = await this.usersService.findByEmail(created.email);
      }
    }

    if (!user) {
      throw new BadRequestException('Failed to create or find user');
    }

    const subject = typeof user._id === 'string' ? user._id : String(user._id);
    const payload = { sub: subject, email: user.email };
    const access_token = await this.jwtService.signAsync(payload, {
      jwtid: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    return { 
      access_token,
      onboardingCompleted: user.onboardingCompleted || false
    };
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<{ message: string }> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return { message: 'If email exists, reset link has been sent' };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = await bcrypt.hash(resetToken, 10);
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await this.usersService.setResetPasswordToken(
      email,
      hashedToken,
      expires,
    );

    // Send email with reset link
    try {
      await this.emailService.sendPasswordResetEmail(email, resetToken);
      console.log(`✅ Email wysłany do: ${email}`);
    } catch (error) {
      console.error('❌ Błąd wysyłki emaila:', error);
      // Still return success message for security
    }
    
    return { message: 'If email exists, reset link has been sent' };
  }

  // Reset password with token
  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const user = await this.usersService.findByResetToken();
    
    if (!user || !user.resetPasswordToken || !user.resetPasswordExpires) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    const valid = await bcrypt.compare(token, user.resetPasswordToken);
    if (!valid) {
      throw new BadRequestException('Invalid reset token');
    }

    // Set new password
    const hashed = await bcrypt.hash(newPassword, 10);
    await this.usersService.resetPassword(user.email, hashed);

    return { message: 'Password has been reset successfully' };
  }
}

