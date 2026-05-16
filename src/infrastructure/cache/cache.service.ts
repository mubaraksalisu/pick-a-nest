import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async set(key: string, value: unknown, ttl: number = 60 * 1000) {
    await this.cacheManager.set(key, value, ttl);
  }

  async get(key: string) {
    return await this.cacheManager.get(key);
  }

  async delete(key: string) {
    await this.cacheManager.del(key);
  }
}
