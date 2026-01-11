import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateVisitDto {
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
}
