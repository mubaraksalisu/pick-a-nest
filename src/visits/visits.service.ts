import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateVisitDto, VisitStatus } from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Visit } from './schemas/visit.schema';
import { Model } from 'mongoose';
import { Property } from 'src/properties/schemas/property.schema';
import { User } from 'src/users/schemas/user.schema';
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';
import * as luxon from 'luxon';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    @InjectModel(Property.name) private propertyModel: Model<Property>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async create(createVisitDto: CreateVisitDto): Promise<Visit> {
    const {
      propertyId,
      agentId,
      clientId,
      startIso,
      endIso,
      idempotencyKey,
      note,
      status,
    } = createVisitDto;

    if (idempotencyKey) {
      const existing = await this.visitModel.findOne({ idempotencyKey });
      if (existing) return existing;
    }

    await this.confirmIdsIndatabase(propertyId, agentId, clientId);

    const start = luxon.DateTime.fromISO(startIso).toUTC();
    const end = luxon.DateTime.fromISO(endIso).toUTC();
    this.assertValidWindow(start, end);

    const overlap = await this.visitModel.findOne({
      status: { $ne: VisitStatus.CANCELED },
      deletedAt: null,
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (overlap)
      throw new ConflictException('Time slot overlaps with existing visit');

    const visit = new this.visitModel({
      agentId,
      clientId,
      propertyId,
      idempotencyKey,
      note,
      status: status || VisitStatus.REQUESTING,
      startUtc: start.toJSDate(),
      endUtc: end.toJSDate(),
    });
    return await visit.save();
  }

  async findAll(userId?: string, propertyId?: string): Promise<Visit[]> {
    const query = {} as any;
    if (userId) {
      query.$or = [{ agentId: userId }, { clientId: userId }];
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

  async reschedule(id: string, updateVisitDto: UpdateVisitDto) {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException('No visit with the provided id');

    if (
      ![
        VisitStatus.REQUESTING.toString(),
        VisitStatus.SCHEDULED.toString(),
      ].includes(visit.status)
    ) {
      throw new BadRequestException(
        'Only requesting/scheduled visits can be rescheduled',
      );
    }

    const start = luxon.DateTime.fromISO(updateVisitDto.startIso).toUTC();
    const end = luxon.DateTime.fromISO(updateVisitDto.endIso).toUTC();
    this.assertValidWindow(start, end);

    const overlap = await this.visitModel.findOne({
      propertyId: visit._id,
      deletedAt: null,
      _id: { $ne: id },
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (overlap)
      throw new ConflictException('Time slot overlaps with existing visit');

    visit.startUtc = start.toJSDate();
    visit.endUtc = end.toJSDate();
    if (updateVisitDto.note !== undefined) visit.notes = updateVisitDto.note;
    visit.status = VisitStatus.REQUESTING;

    return await visit.save();
  }

  async softDelete(id: string) {
    const visit = await this.visitModel.findById(id);
    if (!visit)
      throw new NotFoundException('No scheduled visit with the provided id');

    visit.deletedAt = new Date();
    return await visit.save();
  }

  private async confirmIdsIndatabase(
    propertyId: string,
    agentId: string,
    clientId: string,
  ) {
    const property = await this.propertyModel.findById(propertyId);
    if (!property)
      throw new BadRequestException(
        'No property with the provided propertyId found',
      );

    const agent = await this.userModel.findById(agentId);
    if (!agent)
      throw new BadRequestException('No user with the provided agentId found');

    const client = await this.userModel.findById(clientId);
    if (!client)
      throw new BadRequestException('No user with the provided clientId found');
  }

  private assertValidWindow(start: luxon.DateTime, end: luxon.DateTime) {
    if (!start.isValid || !end.isValid)
      throw new BadRequestException('Invalid date format');
    if (end <= start) throw new BadRequestException('End must be after start');
    if (start < luxon.DateTime.utc())
      throw new BadRequestException('Start must be in the future');

    const visitDuration = 2;

    if (end.diff(start, 'hours').hours > visitDuration)
      throw new BadRequestException('Visit duration must be <= 4 hours');
  }
}
