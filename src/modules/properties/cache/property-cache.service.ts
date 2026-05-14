import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PropertyQueryDto } from '../dto/property-query.dto';

@Injectable()
export class PropertyCacheService {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async set(key: string, data: any) {
    await this.cacheManager.set(key, data);
  }

  async get(key: string) {
    return await this.cacheManager.get(key);
  }
}
