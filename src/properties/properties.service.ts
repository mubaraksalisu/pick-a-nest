import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Property } from './schemas/property.schema';
import { Model } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { CategoriesService } from 'src/categories/categories.service';

@Injectable()
export class PropertiesService {
  constructor(
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

  async findAll({ limit, page }) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.propertyModel
        .find()
        .skip(skip)
        .limit(limit)
        .populate({ path: 'ownerId', select: '-password' })
        .populate('categoryId')
        .sort('_id'),

      this.propertyModel.countDocuments(),
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
    const property = await this.propertyModel
      .findById(id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');
    if (!property)
      throw new NotFoundException('No property with the provided id');

    return property;
  }

  async update(id: string, updatePropertyDto: UpdatePropertyDto) {
    let property = await this.propertyModel.findById(id);
    if (!property)
      throw new NotFoundException('No property with the provided id found');

    if (updatePropertyDto.ownerId) {
      // This will throw if not found, so no need for manual checks
      await this.usersService.findOne(updatePropertyDto.ownerId);
    }

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
}
