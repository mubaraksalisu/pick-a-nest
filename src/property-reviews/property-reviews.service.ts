import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePropertyReviewDto } from './dto/create-property-review.dto';
import { UpdatePropertyReviewDto } from './dto/update-property-review.dto';
import { InjectModel } from '@nestjs/mongoose';
import { PropertyReview } from './schemas/property-review.schema';
import { Model } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';
import { Property } from 'src/properties/schemas/property.schema';
import { QueryParams } from './interfaces/query-params.interface';
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';

@Injectable()
export class PropertyReviewsService {
  constructor(
    @InjectModel(PropertyReview.name)
    private propertyReviewModel: Model<PropertyReview>,
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
  ) {}

  async create(
    createPropertyReviewDto: CreatePropertyReviewDto,
  ): Promise<PropertyReview> {
    const { userId, propertyId } = createPropertyReviewDto;

    const user = await this.userModel.findById(userId);
    if (!user)
      throw new BadRequestException('No user with the provided userId found');

    const property = await this.propertyModel.findById(propertyId);
    if (!property)
      throw new BadRequestException(
        'No property with the provided propertyId found',
      );

    let propertyReview = await this.propertyReviewModel.findOne({
      userId,
      propertyId,
    });
    if (propertyReview)
      throw new BadRequestException('User already reviewed property');

    propertyReview = new this.propertyReviewModel({
      ...createPropertyReviewDto,
    });
    return await propertyReview.save();
  }

  async findAll(
    userId?: string,
    propertyId?: string,
  ): Promise<PropertyReview[]> {
    const filter: QueryParams = {} as QueryParams;

    if (userId) {
      if (!isValidObjectId(userId))
        throw new BadRequestException('Invalid userId queryString');
      filter.userId = userId;
    }

    if (propertyId) {
      if (!isValidObjectId(propertyId))
        throw new BadRequestException('Invalid propertyId queryString');
      filter.propertyId = propertyId;
    }

    const propertyReview = await this.propertyReviewModel.find(filter);
    return propertyReview;
  }

  async findOne(id: string): Promise<PropertyReview> {
    const propertyReview = await this.propertyReviewModel.findById(id);
    if (!propertyReview)
      throw new NotFoundException('No review with the provided id');
    return propertyReview;
  }

  async update(
    id: string,
    updatePropertyReviewDto: UpdatePropertyReviewDto,
  ): Promise<PropertyReview> {
    let propertyReview = await this.propertyReviewModel.findById(id);
    if (!propertyReview)
      throw new NotFoundException('No property review with the provided id');

    const { userId, propertyId } = updatePropertyReviewDto;

    if (userId) {
      const user = await this.userModel.findById(userId);
      if (!user)
        throw new BadRequestException('No user with the provided userId found');
    }

    if (propertyId) {
      const property = await this.propertyModel.findById(propertyId);
      if (!property)
        throw new BadRequestException(
          'No property with the provided propertyId found',
        );
    }

    Object.assign(propertyReview, updatePropertyReviewDto);
    await propertyReview.save();

    return propertyReview;
  }

  async remove(id: string): Promise<PropertyReview> {
    const propertyReview = await this.propertyReviewModel.findByIdAndDelete(id);
    if (!propertyReview)
      throw new NotFoundException('No review with the provided id');

    return propertyReview;
  }
}
