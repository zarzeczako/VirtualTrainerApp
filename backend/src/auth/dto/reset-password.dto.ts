import { IsString, MinLength, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @MinLength(32)
  @MaxLength(64)
  token: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  newPassword: string;
}
