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
  virtualTourLink: string;

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

export class CreatePropertyResponseDto {
  '_id': '69524fa190c845b73b270f21';
  'title': 'Duplex';
  'description': 'duplex for a family of 4';
  'address': 'kofar ruwa';
  'city': 'kano';
  'state': 'kano';
  'price': 2000000;
  'transactionType': 'rent';
  'bedroom': 4;
  'bathroom': 5;
  'livingRoom': 2;
  'parkingSpace': 2;
  'pool': 0;
  'ownerId': {
    _id: '694fc52b6e6b4425b2fef6e8';
    firstName: 'mubarak';
    lastName: 'salisu';
    email: 'marksmanl619@gmail.com';
    role: 'admin';
    phone: '08069245966';
    active: true;
    imageUrl: 'string';
    createdAt: '2025-12-27T11:38:19.557Z';
    updatedAt: '2025-12-27T11:38:19.557Z';
    __v: 0;
  };
  'categoryId': {
    _id: '69524c834b8223e4ca70fb97';
    name: 'House';
    description: 'A whole family home';
    icon: 'home';
    createdAt: '2025-12-29T09:40:19.754Z';
    updatedAt: '2025-12-29T09:40:19.754Z';
    __v: 0;
  };
  'status': 'available';
  'media': [
    'https://www.bhg.com/thmb/TD9qUnFen4PBLDuB2hn9yhGXPv8=/1866x0/filters:no_upscale():strip_icc()/white-house-a-frame-section-c0a4a3b3-e722202f114e4aeea4370af6dbb4312b.jpg',
  ];
  'rentDuration': 'yearly';
  'propertySize': '100m square';
  'createdAt': '2025-12-29T09:53:37.334Z';
  'updatedAt': '2025-12-29T09:53:37.334Z';
  '__v': 0;
}
