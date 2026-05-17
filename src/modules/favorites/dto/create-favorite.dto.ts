import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateFavoriteDto {
  @IsMongoId()
  @IsNotEmpty()
  @ApiProperty({ description: 'ID of property to be added to favorite list' })
  propertyId: string;
}

export class CreateFavoriteResponseDto {
  userId: string;
  propertyId: string;
  _id: string;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
}

export class MyFavoritesResponseDto {
  favorites: CreateFavoriteResponseDto[];
}
