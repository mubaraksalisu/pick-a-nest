import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
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

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['rent', 'sell'])
  @Transform(({ value }) => value || 'rent')
  transactionType: string;

  @IsNumber()
  @Min(1)
  bedroom: number;

  @IsNumber()
  @Min(1)
  bathroom: number;

  @IsNumber()
  @Min(0)
  livingRoom: number;

  @IsNumber()
  @Min(0)
  parkingSpace: number;

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

  @IsArray({ message: 'Must be an array' })
  @ArrayMinSize(1, { message: 'Array must contain at least 1 item' })
  @IsUrl({}, { each: true, message: 'Each item must be a valid URL' })
  @Type(() => String)
  media: string[];

  @IsString()
  @IsEnum(['daily', 'weekly', 'monthly', 'yearly'])
  @Transform(({ value }) => value || 'yearly')
  rentDuration: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  propertySize: string;
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
  media: string[];
  rentDuration: string;
  propertySize: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}
