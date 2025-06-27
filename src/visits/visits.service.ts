import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Visit } from './schemas/visit.schema';
import { Model } from 'mongoose';
import { Property } from 'src/properties/schemas/property.schema';
import { User } from 'src/users/schemas/user.schema';
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createVisitDto: CreateVisitDto): Promise<Visit> {
    const { propertyId, ownerId, clientId } = createVisitDto;

    if (!isValidObjectId(propertyId))
      throw new BadRequestException('Invalid propertyId');

    if (!isValidObjectId(ownerId))
      throw new BadRequestException('Invalid ownerId');

    if (!isValidObjectId(clientId))
      throw new BadRequestException('Invalid clientId');

    const property = await this.propertyModel.findById(propertyId);
    if (!property)
      throw new BadRequestException(
        'No property with the provided propertyId found',
      );

    const owner = await this.userModel.findById(ownerId);
    if (!owner)
      throw new BadRequestException('No user with the provided ownerId found');

    const client = await this.userModel.findById(clientId);
    if (!client)
      throw new BadRequestException('No user with the provided clientId found');

    const visit = new this.visitModel({ ...CreateVisitDto });
    return await visit.save();
  }

  async findAll(userId?: string, propertyId?: string): Promise<Visit[]> {
    const query = {} as any;
    if (userId) {
      query.$or = [{ ownerId: userId }, { clientId: userId }];
    }

    if (propertyId) query.propertyId = propertyId;

    const visits = await this.visitModel.find(query);

    return visits;
  }

  async findOne(id: string) {
    const visit = await this.visitModel.findById(id);
    if (!visit)
      throw new NotFoundException('No scheduled visit with the provided id');

    return visit;
  }

  async update(id: string, updateVisitDto: UpdateVisitDto) {
    const { ownerId, propertyId, clientId } = updateVisitDto;

    if (ownerId) {
      if (!isValidObjectId(ownerId))
        throw new BadRequestException('Invalid ownerId');

      const owner = await this.userModel.findById(ownerId);
      if (!owner)
        throw new BadRequestException(
          'No user with the provided ownerId found',
        );
    }

    if (propertyId) {
      if (!isValidObjectId(propertyId))
        throw new BadRequestException('Invalid propertyId');

      const property = await this.propertyModel.findById(propertyId);
      if (!property)
        throw new BadRequestException(
          'No property with the provided propertyId found',
        );
    }

    if (clientId) {
      if (!isValidObjectId(clientId))
        throw new BadRequestException('Invalid clientId');

      const client = await this.userModel.findById(clientId);
      if (!client)
        throw new BadRequestException(
          'No user with the provided clientId found',
        );
    }

    const visit = await this.visitModel.findByIdAndUpdate(id, updateVisitDto, {
      new: true,
    });

    return visit;
  }

  async remove(id: string) {
    const visit = await this.visitModel.findByIdAndDelete(id);
    if (!visit)
      throw new NotFoundException('No scheduled visit with the provided id');

    return visit;
  }
}
