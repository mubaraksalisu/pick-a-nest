import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Property } from './schemas/property.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/modules/users/users.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { PropertyQueryDto } from './dto/property-query.dto';
import { CacheService } from 'src/infrastructure/cache/cache.service';
import { PropertiesCacheKeys } from 'src/infrastructure/cache/cache.keys';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    private usersService: UsersService,
    private categoryModel: CategoriesService,
    private cacheService: CacheService,
  ) {}

  async create(createPropertyDto: CreatePropertyDto) {
    // These will throw if not found, so no need for manual checks
    await this.usersService.findOne(createPropertyDto.ownerId);
    await this.categoryModel.findOne(createPropertyDto.categoryId);

    let property = new this.propertyModel({ ...createPropertyDto });
    property = await property.save();

    await this.incrementPropertyListCacheVersion();

    const populatedProperty = await this.propertyModel
      .findById(property._id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    return populatedProperty;
  }

  async findAll(query: PropertyQueryDto) {
    const cacheKey = await this.buildCacheKey(query);
    const cachedProperties = await this.cacheService.get(cacheKey);
    if (cachedProperties) return cachedProperties;

    const filters = this.buildFilters(query);

    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const sort: any = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    };

    const [data, total] = await Promise.all([
      this.propertyModel
        .find(filters)
        .skip(skip)
        .limit(limit)
        .populate({ path: 'ownerId', select: '-password' })
        .populate('categoryId')
        .sort(sort)
        .lean(),

      this.propertyModel.countDocuments(filters),
    ]);

    const result = {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };

    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);

    return result;
  }

  async findOne(id: string) {
    const key = PropertiesCacheKeys.propertyById(id);
    const cachedProperty = await this.cacheService.get(key);
    if (cachedProperty) {
      return cachedProperty;
    }

    const property = await this.propertyModel
      .findById(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id');

    await this.cacheService.set(key, property, 5 * 60 * 1000);

    return property;
  }

  async update(
    id: string,
    authUserId: string,
    updatePropertyDto: UpdatePropertyDto,
  ) {
    let property = await this.propertyModel.findById(id);
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    if (updatePropertyDto.categoryId) {
      // This will throw if not found, so no need for manual checks
      await this.categoryModel.findOne(updatePropertyDto.categoryId);
    }

    if (authUserId.toString() !== property.ownerId.toString())
      throw new UnauthorizedException('Only property owner can update');

    Object.assign(property, updatePropertyDto);
    await property.save();

    property = await this.propertyModel
      .findById(property._id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    // Clear caches
    const key = PropertiesCacheKeys.propertyById(id);
    await this.cacheService.delete(key);
    await this.incrementPropertyListCacheVersion();

    return property;
  }

  async remove(id: string) {
    const property = await this.propertyModel
      .findByIdAndDelete(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    // Clear caches
    const key = PropertiesCacheKeys.propertyById(id);
    await this.cacheService.delete(key);
    await this.incrementPropertyListCacheVersion();

    return property;
  }

  async findFeatured(pageNumber = 1, limit = 10) {
    const page = Math.max(1, pageNumber);
    const normalizedLimit = Math.max(1, Math.min(limit, 50));
    const skip = (page - 1) * normalizedLimit;

    const cacheKey = PropertiesCacheKeys.featured(
      await this.getPropertyListCacheVersion(),
      page,
      normalizedLimit,
    );

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [data, total] = await Promise.all([
      this.propertyModel
        .find({ featured: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .populate({ path: 'ownerId', select: '-password' })
        .populate('categoryId')
        .lean(),
      this.propertyModel.countDocuments({ featured: true }),
    ]);

    const result = {
      data,
      total,
      page: pageNumber,
      limit: normalizedLimit,
      totalPage: Math.ceil(total / normalizedLimit),
    };

    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async findLatest(pageNumber = 1, limit = 10) {
    const page = Math.max(1, pageNumber);
    const normalizedLimit = Math.max(1, Math.min(limit, 50));
    const skip = (page - 1) * normalizedLimit;

    const cacheKey = PropertiesCacheKeys.latest(
      await this.getPropertyListCacheVersion(),
      page,
      normalizedLimit,
    );

    const cached = await this.cacheService.get(cacheKey);
    if (cached) return cached;

    const [data, total] = await Promise.all([
      this.propertyModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(normalizedLimit)
        .populate({ path: 'ownerId', select: '-password' })
        .populate('categoryId')
        .lean(),
      this.propertyModel.countDocuments(),
    ]);

    const result = {
      data,
      total,
      page: pageNumber,
      limit: normalizedLimit,
      totalPage: Math.ceil(total / normalizedLimit),
    };

    await this.cacheService.set(cacheKey, result, 5 * 60 * 1000);
    return result;
  }

  async setFeatured(id: string, featured: boolean) {
    const property = await this.propertyModel.findById(id);
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    property.featured = featured;
    await property.save();

    const updatedProperty = await this.propertyModel
      .findById(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    const key = PropertiesCacheKeys.propertyById(id);
    await this.cacheService.delete(key);
    await this.incrementPropertyListCacheVersion();

    return updatedProperty;
  }

  private async getPropertyListCacheVersion(): Promise<number> {
    const version = await this.cacheService.get(
      PropertiesCacheKeys.listVersion,
    );
    const parsed = typeof version === 'number' ? version : Number(version);

    if (!parsed || Number.isNaN(parsed)) {
      await this.cacheService.set(PropertiesCacheKeys.listVersion, 1);
      return 1;
    }

    return parsed;
  }

  private async incrementPropertyListCacheVersion() {
    const currentVersion = await this.getPropertyListCacheVersion();
    await this.cacheService.set(
      PropertiesCacheKeys.listVersion,
      currentVersion + 1,
    );
  }

  private buildFilters(query: PropertyQueryDto) {
    const {
      city,
      state,
      type,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      search,
    } = query;

    const filters: any = {};

    if (city) filters.city = new RegExp(city, 'i');
    if (state) filters.state = new RegExp(state, 'i');
    if (type) filters.type = type;
    if (bedrooms) filters.bedrooms = { $gte: bedrooms };
    if (bathrooms) filters.bathrooms = { $gte: bathrooms };

    if (minPrice || maxPrice) {
      filters.price = {};
      if (minPrice) filters.price.$gte = minPrice;
      if (maxPrice) filters.price.$lte = maxPrice;
    }

    if (search) {
      filters.$text = {
        $search: search,
      };
    }

    return filters;
  }

  private async buildCacheKey(query: PropertyQueryDto) {
    const version = await this.getPropertyListCacheVersion();
    const sorted = Object.keys(query)
      .sort()
      .reduce((obj, key) => {
        obj[key] = query[key];
        return obj;
      }, {});

    return PropertiesCacheKeys.queryList(version, JSON.stringify(sorted));
  }
}
