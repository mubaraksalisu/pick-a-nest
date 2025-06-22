import { IsMongoId, IsNotEmpty } from 'class-validator';

export class CreateFavoriteDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @IsMongoId()
  @IsNotEmpty()
  propertId: string;
}
