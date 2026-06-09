import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuid } from 'uuid';
import { extname } from 'path';

@Injectable()
export class AwsS3Service {
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cdnUrl?: string;

  constructor(private configService: ConfigService) {
    this.region = this.configService.getOrThrow<string>('AWS_REGION');
    const accessKeyId =
      this.configService.getOrThrow<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.getOrThrow<string>(
      'AWS_SECRET_ACCESS_KEY',
    );
    this.bucket = this.configService.getOrThrow<string>('AWS_S3_BUCKET');
    this.cdnUrl = this.configService.get<string>('CDN_URL');

    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async createPresignedUploadUrl(
    fileName: string,
    contentType: string,
    expiresInSeconds = 900,
  ) {
    const extension = this.getExtension(fileName, contentType);
    const key = `properties/${uuid()}${extension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiresInSeconds,
    });

    return {
      key,
      uploadUrl,
      url: this.getPublicUrl(key),
      expiresIn: expiresInSeconds,
    };
  }

  private getExtension(fileName: string, contentType: string) {
    const extension = extname(fileName);
    if (extension) {
      return extension.toLowerCase();
    }

    return this.getExtensionFromMimeType(contentType);
  }

  private getExtensionFromMimeType(contentType: string) {
    const mapping: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };

    return mapping[contentType] ?? '';
  }

  getPublicUrl(key: string) {
    if (this.cdnUrl) {
      return `${this.cdnUrl.replace(/\/+$/, '')}/${key}`;
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }
}
