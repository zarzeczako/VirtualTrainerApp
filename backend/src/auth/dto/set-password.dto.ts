import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';

export class SetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password: string;
}
