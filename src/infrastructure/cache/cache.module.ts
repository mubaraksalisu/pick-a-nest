import { Global, Module } from '@nestjs/common';
import { CacheModule as AppCacheModule } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';
import { createKeyv } from '@keyv/redis';

@Global()
@Module({
  imports: [
    AppCacheModule.registerAsync({
      isGlobal: true,
      useFactory: async () => {
        return {
          stores: [createKeyv('redis://localhost:6379')],
          ttl: 60 * 1000,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
