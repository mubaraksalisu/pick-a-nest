import {
  IsDate,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateVisitDto {
  @IsMongoId()
  @IsNotEmpty()
  ownerId: string;

  @IsMongoId()
  @IsNotEmpty()
  clientId: string;

  @IsMongoId()
  @IsNotEmpty()
  propertyId: string;

  @IsDate()
  @IsNotEmpty()
  visitDate: Date;

  @IsString()
  @IsEnum(['requesting', 'completed', 'canceled', 'scheduled'])
  @IsOptional()
  status: string = 'requesting';
}
