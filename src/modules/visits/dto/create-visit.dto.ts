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
  @IsEnum(VisitStatus)
  @IsNotEmpty()
  status: VisitStatus;
}

export class VisitResponseDto {
  '_id': string;
  'agentId': string;
  'clientId': string;
  'propertyId': string;
  'startUtc': string;
  'endUtc': string;
  'status': string;
  'idempotencyKey': string;
  'createdAt': Date;
  'updatedAt': Date;
  '__v': number;
  'notes': string;
}
