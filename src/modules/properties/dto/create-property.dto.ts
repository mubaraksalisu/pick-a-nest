import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(255)
  description: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  address: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  city: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  state: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['rent', 'sell'])
  @Transform(({ value }) => value || 'rent')
  transactionType: string;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bedroom: number;

  @Type(() => Number)
  @IsNumber()
  @Min(1)
  bathroom: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  livingRoom: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  parkingSpace: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  pool: number;

  @IsMongoId()
  @IsNotEmpty()
  ownerId: string;

  @IsMongoId()
  @IsNotEmpty()
  categoryId: string;

  @IsString()
  @IsEnum(['available', 'sold', 'rented'])
  @Transform(({ value }) => value || 'available')
  status: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2048)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  virtualTourLink?: string;

  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  @IsOptional()
  rentDuration?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  propertySize: string;

  @ApiProperty({
    type: [String],
    description: 'S3 object keys for property images',
    example: ['properties/1234abcd-photo.jpg'],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(2048, { each: true })
  @IsNotEmpty({ each: true })
  media: string[];
}

export class PropertyResponseDto {
  _id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  price: number;
  transactionType: string;
  bedroom: number;
  bathroom: number;
  livingRoom: number;
  parkingSpace: number;
  pool: number;
  ownerId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    phone: string;
    active: boolean;
    imageUrl: string;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
  };
  categoryId: {
    _id: string;
    name: string;
    description: string;
    icon: string;
    createdAt: Date;
    updatedAt: Date;
    __v: number;
  };
  status: string;
  reviewStatus: string;
  featured: boolean;
  media: string[];
  rentDuration: string;
  propertySize: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}
