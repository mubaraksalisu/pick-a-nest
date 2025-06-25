import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Property } from './schemas/property.schema';
import { Model, Types } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Category } from 'src/categories/schemas/category.schema';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Category.name) private categoryModel: Model<Category>,
  ) {}

  async create(createPropertyDto: CreatePropertyDto) {
    const user = await this.userModel.findById(createPropertyDto.ownerId);
    if (!user)
      throw new NotFoundException('No user found with the provided ownerId');

    const category = await this.categoryModel.findById(
      createPropertyDto.categoryId,
    );
    if (!category)
      throw new NotFoundException(
        'No category found with the provided categoryId',
      );

    let property = new this.propertyModel({ ...createPropertyDto });
    property = await property.save();

    const populatedProperty = await this.propertyModel
      .findById(property._id)
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId');

    return populatedProperty;
  }

  async findAll() {
    return await this.propertyModel
      .find()
      .populate({ path: 'ownerId', select: '-password' })
      .populate('categoryId')
      .sort('_id');
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
      const user = await this.userModel.findById(updatePropertyDto.ownerId);
      if (!user)
        throw new NotFoundException('No user found with the provided ownerId');
    }

    if (updatePropertyDto.categoryId) {
      const category = await this.categoryModel.findById(
        updatePropertyDto.categoryId,
      );
      if (!category)
        throw new NotFoundException(
          'No category found with the provided categoryId',
        );
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
