import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreatePresignedUploadUrlDto {
  @ApiProperty({
    description: 'Original image file name used to preserve extension in S3',
    example: 'living-room.jpg',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  fileName: string;

  @ApiProperty({
    description: 'MIME type for the upload',
    example: 'image/jpeg',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^image\/(jpeg|jpg|png|webp)$/i, {
    message: 'Only JPEG, PNG, and WEBP images are supported.',
  })
  fileType: string;
}
