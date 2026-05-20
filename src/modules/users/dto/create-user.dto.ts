import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  MinLength,
  MaxLength,
  IsEnum,
  Min,
  IsInt,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({ description: 'User firstname', example: 'John' })
  firstName: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @ApiProperty({ description: 'User lastname', example: 'Doe' })
  lastName: string;

  @IsEmail()
  @MinLength(5)
  @MaxLength(255)
  @ApiProperty({
    description: 'User email address',
    example: 'johndoe@email.com',
  })
  email: string;

  @IsString()
  @MinLength(5)
  @MaxLength(255)
  @ApiProperty({ description: 'User password', example: '123456' })
  password: string;

  @IsString()
  @MinLength(5)
  @MaxLength(20)
  @ApiProperty({ description: 'User phone number', example: '08012345678' })
  phone: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2048)
  @IsOptional()
  @ApiProperty({ description: 'User profile picture' })
  imageUrl?: string;
}

export class UserResponseDto {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  agentReviewStatus: string;
  phone: string;
  status: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export class PaginationDto {
  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page: number = 1;

  @Min(1)
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  limit: number = 10;
}

export class GetUsersResponseDto {
  data: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPage: number;
}
