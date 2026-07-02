import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetFeaturedPropertyDto {
  @ApiProperty({
    description:
      'Set to true to mark property as featured, false to remove featured status',
    type: Boolean,
  })
  @IsBoolean()
  featured: boolean;
}
