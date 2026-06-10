import {
  IsDateString,
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';

export enum VisitStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export class CreateVisitDto {
  @IsMongoId()
  @IsNotEmpty()
  agentId: string;

  @IsMongoId()
  @IsNotEmpty()
  customerId: string;

  @IsMongoId()
  @IsNotEmpty()
  propertyId: string;

  @IsDateString()
  @IsNotEmpty()
  visitDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  @MaxLength(256)
  note?: string;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}

export class ChangeStatusDto {
  @IsEnum(VisitStatus)
  @IsNotEmpty()
  status: VisitStatus;
}

export class VisitResponseDto {
  _id: string;
  agentId: string;
  customerId: string;
  propertyId: string;
  visitDate: string;
  startTime: string;
  endTime: string;
  startUtc: string;
  endUtc: string;
  status: string;
  notes?: string;
  cancellationReason?: string;
  feedback?: {
    rating: number;
    comment?: string;
  };
  confirmedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  rescheduledAt?: Date;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}
