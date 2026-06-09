import { ApiProperty } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

export class SwaggerUploadDto extends CreatePropertyDto {
  @ApiProperty({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  media: any[];
}
