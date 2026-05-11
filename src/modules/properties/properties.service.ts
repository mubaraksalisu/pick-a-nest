import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Property } from './schemas/property.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/modules/users/users.service';
import { CategoriesService } from 'src/modules/categories/categories.service';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { PropertyQueryDto } from './dto/property-query.dto';

@Injectable()
export class PropertiesService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    private usersService: UsersService,
    private categoryModel: CategoriesService,
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

    return {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const cachedProperty = await this.cacheManager.get<Property>(
      `property:${id}`,
    );
    if (cachedProperty) {
      console.log('Cache hit for property: ', id);
      return cachedProperty;
    }

    const property = await this.propertyModel
      .findById(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id');

    await this.cacheManager.set(`property:${id}`, property);
    // console.log('Store Type:', (this.cacheManager as any).store.name);

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

  buildFilters(query: PropertyQueryDto) {
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
}
