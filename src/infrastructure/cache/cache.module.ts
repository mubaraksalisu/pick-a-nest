import { Global, Module } from '@nestjs/common';
import { CacheModule as AppCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { createKeyv } from '@keyv/redis';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    ConfigModule,
    AppCacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisUrl =
          configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379';

        return {
          stores: [createKeyv(redisUrl)],
          ttl: 60 * 1000,
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
