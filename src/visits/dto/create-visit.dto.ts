import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum VisitStatus {
  REQUESTING = 'requesting',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

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

  @IsDateString()
  @IsNotEmpty()
  startIso: Date;

  @IsDateString()
  @IsNotEmpty()
  endIso: Date;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  note: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsString()
  @IsEnum(VisitStatus)
  @IsOptional()
  status: VisitStatus = VisitStatus.REQUESTING;
}
