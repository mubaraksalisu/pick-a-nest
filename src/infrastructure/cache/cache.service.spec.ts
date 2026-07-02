import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let cacheManager: { set: jest.Mock; get: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    cacheManager = {
      set: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      del: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('set', () => {
    it('should store the value with the default ttl when none is provided', async () => {
      await service.set('key1', { foo: 'bar' });

      expect(cacheManager.set).toHaveBeenCalledWith(
        'key1',
        { foo: 'bar' },
        60 * 1000,
      );
    });

    it('should store the value with a custom ttl when provided', async () => {
      await service.set('key1', { foo: 'bar' }, 5 * 60 * 1000);

      expect(cacheManager.set).toHaveBeenCalledWith(
        'key1',
        { foo: 'bar' },
        5 * 60 * 1000,
      );
    });
  });

  describe('get', () => {
    it('should return the cached value when present', async () => {
      cacheManager.get.mockResolvedValue({ foo: 'bar' });

      const result = await service.get('key1');

      expect(cacheManager.get).toHaveBeenCalledWith('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return undefined when the key is not cached', async () => {
      cacheManager.get.mockResolvedValue(undefined);

      const result = await service.get('missing');

      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete the key from the cache', async () => {
      await service.delete('key1');

      expect(cacheManager.del).toHaveBeenCalledWith('key1');
    });
  });
});
