import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

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

  async clearSingle(id: string) {
    await this.cacheManager.del(`property:${id}`);
  }

  async clearLists() {
    // const keys = this.getAllKeys();

    // const regex = /^properties:.*/;
    // const keysToDelete = keys.filter((key) => regex.test(key));

    // // 3. Delete keys if matches were found
    // if (keysToDelete.length > 0) {
    //   await this.cacheManager.del(keysToDelete);
    // }
    return;
  }

  private async getAllKeys() {
    // @ts-ignore - access the stores array if using multiple stores
    const storeIterator = this.cacheManager.stores[0]?.iterator;

    if (storeIterator) {
      const keys: string[] = [];
      // 'namespace' is usually the prefix you've set, or 'keyv' by default
      for await (const [key] of storeIterator('namespace')) {
        keys.push(key);
      }
      return keys;
    }
  }
}
