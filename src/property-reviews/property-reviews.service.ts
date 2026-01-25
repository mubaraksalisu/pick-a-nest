import {
  BadRequestException,
  ConflictException,
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
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';
import { FindAllQueryParamsDto } from './dto/find-all-query-params.dto';

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
      throw new ConflictException('User already reviewed property');

    propertyReview = new this.propertyReviewModel({
      ...createPropertyReviewDto,
    });
    return await propertyReview.save();
  }

  async findAll(queryParams: FindAllQueryParamsDto) {
    const { userId, propertyId, page, limit } = queryParams;
    const filter: any = {};
    const skip = (page - 1) * limit;

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

    const [data, total] = await Promise.all([
      this.propertyReviewModel.find(filter).skip(skip).limit(limit),
      this.propertyReviewModel.countDocuments(filter),
    ]);
    return {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<PropertyReview> {
    const propertyReview = await this.propertyReviewModel.findById(id);
    if (!propertyReview)
      throw new NotFoundException('No property review with the provided id');
    return propertyReview;
  }

  async update(
    id: string,
    updatePropertyReviewDto: UpdatePropertyReviewDto,
  ): Promise<PropertyReview> {
    let propertyReview = await this.propertyReviewModel.findById(id);
    if (!propertyReview)
      throw new NotFoundException('No property review with the provided id');

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
