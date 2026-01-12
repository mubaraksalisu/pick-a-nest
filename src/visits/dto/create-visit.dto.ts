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
  agentId: string;

  @IsMongoId()
  @IsNotEmpty()
  clientId: string;

  @IsMongoId()
  @IsNotEmpty()
  propertyId: string;

  @IsDateString()
  @IsNotEmpty()
  startIso: string;

  @IsDateString()
  @IsNotEmpty()
  endIso: string;

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

export class ChangeStatusDto {
  status: string;
}
