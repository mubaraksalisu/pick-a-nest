import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  lastName: string;

  @IsEmail()
  @MinLength(5)
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  password: string;

  @IsString()
  @IsOptional()
  @IsEnum(['user', 'admin'])
  role?: string = 'user';

  @IsString()
  @MinLength(5)
  @MaxLength(20)
  phone: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean = true;

  @IsString()
  @MinLength(5)
  @MaxLength(2048)
  @IsOptional()
  imageUrl?: string;
}
