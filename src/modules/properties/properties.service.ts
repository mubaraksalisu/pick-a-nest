import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Property } from './schemas/property.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/modules/users/users.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { PropertyQueryDto } from './dto/property-query.dto';
import { PropertyCacheService } from './cache/property-cache.service';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    private usersService: UsersService,
    private categoryModel: CategoriesService,
    private readonly propertyCache: PropertyCacheService,
  ) {}

  async create(createPropertyDto: CreatePropertyDto) {
    // These will throw if not found, so no need for manual checks
    await this.usersService.findOne(createPropertyDto.ownerId);
    await this.categoryModel.findOne(createPropertyDto.categoryId);

    let property = new this.propertyModel({ ...createPropertyDto });
    property = await property.save();

    const populatedProperty = await this.propertyModel
      .findById(property._id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    return populatedProperty;
  }

  async findAll(query: PropertyQueryDto) {
    const cacheKey = this.buildCacheKey(query);
    const cachedProperties = await this.propertyCache.get(cacheKey);
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

    await this.propertyCache.set(cacheKey, result);

    return result;
  }

  async findOne(id: string) {
    const cachedProperty = await this.propertyCache.get(`property:${id}`);
    if (cachedProperty) {
      return cachedProperty;
    }

    const property = await this.propertyModel
      .findById(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id');

    await this.propertyCache.set(`property:${id}`, property);

    return property;
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    let property = await this.propertyModel.findById(id);
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    if (updatePropertyDto.categoryId) {
      // This will throw if not found, so no need for manual checks
      await this.categoryModel.findOne(updatePropertyDto.categoryId);
    }

    Object.assign(property, updatePropertyDto);
    await property.save();

    property = await this.propertyModel
      .findById(property._id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    return property;
  }

  async remove(id: string) {
    const property = await this.propertyModel
      .findByIdAndDelete(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    return property;
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

  private buildCacheKey(query: PropertyQueryDto) {
    const sorted = Object.keys(query)
      .sort()
      .reduce((obj, key) => {
        obj[key] = query[key];
        return obj;
      }, {});

    return `properties:${JSON.stringify(sorted)}`;
  }
}
