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
import { FindAllQueryParamsDto } from './dto/find-all-query-params.dto';
import { UsersService } from 'src/modules/users/users.service';
import { PropertiesService } from 'src/modules/properties/properties.service';

@Injectable()
export class PropertyReviewsService {
  constructor(
    @InjectModel(PropertyReview.name)
    private propertyReviewModel: Model<PropertyReview>,
    private usersService: UsersService,
    private propertyService: PropertiesService,
  ) {}

  async create(
    createPropertyReviewDto: CreatePropertyReviewDto,
  ): Promise<PropertyReview> {
    const { userId, propertyId } = createPropertyReviewDto;

    // These will throw if not found, so no need for manual checks
    await this.usersService.findOne(userId);
    await this.propertyService.findOne(propertyId);

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
      filter.userId = userId;
    }

    if (propertyId) {
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
