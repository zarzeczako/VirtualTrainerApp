import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateEmailDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword: string;

  @IsEmail()
  newEmail: string;
}
