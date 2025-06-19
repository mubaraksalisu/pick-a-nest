import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AuthPayloadDto {
  @IsEmail()
  @MinLength(5)
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  password: string;
}
