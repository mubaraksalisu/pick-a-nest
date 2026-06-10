import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChangeStatusDto,
  CreateVisitDto,
  VisitStatus,
} from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Visit } from './schemas/visit.schema';
import { Model } from 'mongoose';
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';
import * as luxon from 'luxon';
import { PropertiesService } from 'src/modules/properties/properties.service';
import { UsersService } from 'src/modules/users/users.service';
import { QueuesService } from 'src/infrastructure/queues/queues.service';
import { EMAIL_JOBS } from 'src/infrastructure/queues/queue.constants';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    private propertiesService: PropertiesService,
    private userModel: UsersService,
    private readonly queuesService: QueuesService,
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

    // Check overlap for the property, agent, and client separately
    const propertyOverlap = await this.visitModel.findOne({
      propertyId,
      status: { $ne: VisitStatus.CANCELED },
      deletedAt: null,
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (propertyOverlap)
      throw new ConflictException(
        'Time slot overlaps with existing visit for this property',
      );

    const agentOverlap = await this.visitModel.findOne({
      agentId,
      status: { $ne: VisitStatus.CANCELED },
      deletedAt: null,
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (agentOverlap)
      throw new ConflictException('Agent has a conflicting visit at this time');

    const clientOverlap = await this.visitModel.findOne({
      clientId,
      status: { $ne: VisitStatus.CANCELED },
      deletedAt: null,
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (clientOverlap)
      throw new ConflictException(
        'Client has a conflicting visit at this time',
      );

    const visit = new this.visitModel({
      agentId,
      clientId,
      propertyId,
      idempotencyKey,
      notes: note,
      status: status || VisitStatus.REQUESTING,
      startUtc: start.toJSDate(),
      endUtc: end.toJSDate(),
    });

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForCreate(
      savedVisit,
      agentId,
      clientId,
      propertyId,
      note,
      status || VisitStatus.REQUESTING,
    );

    return savedVisit;
  }

  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
  ): Promise<Visit> {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException('No visit with the provided id');

    const allowed = {
      [VisitStatus.REQUESTING]: [VisitStatus.CANCELED, VisitStatus.SCHEDULED],
      [VisitStatus.SCHEDULED]: [VisitStatus.CANCELED, VisitStatus.COMPLETED],
      [VisitStatus.CANCELED]: [],
      [VisitStatus.COMPLETED]: [],
    };

    if (!allowed[visit.status].includes(changeStatusDto.status)) {
      throw new BadRequestException(
        `Invalid transition from ${visit.status} to ${changeStatusDto.status}`,
      );
    }

    visit.status = changeStatusDto.status;
    const savedVisit = await visit.save();

    if (savedVisit.status === VisitStatus.SCHEDULED) {
      await this.emitVisitNotificationForStatus(
        savedVisit,
        EMAIL_JOBS.VISIT_SCHEDULED,
      );
    }

    if (savedVisit.status === VisitStatus.CANCELED) {
      await this.emitVisitNotificationForStatus(
        savedVisit,
        EMAIL_JOBS.VISIT_CANCELED,
      );
    }

    return savedVisit;
  }

  async findOne(id: string): Promise<Visit> {
    const visit = await this.visitModel.findById(id);
    if (!visit || visit.deletedAt)
      throw new NotFoundException('No visit with the provided id');

    return visit;
  }

  async reschedule(id: string, updateVisitDto: UpdateVisitDto): Promise<Visit> {
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

    // Check property overlap excluding current visit
    const propertyOverlap = await this.visitModel.findOne({
      propertyId: visit.propertyId,
      deletedAt: null,
      _id: { $ne: id },
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (propertyOverlap)
      throw new ConflictException(
        'Time slot overlaps with existing visit for this property',
      );

    // Check agent overlap excluding current visit
    const agentOverlap = await this.visitModel.findOne({
      agentId: visit.agentId,
      deletedAt: null,
      _id: { $ne: id },
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (agentOverlap)
      throw new ConflictException('Agent has a conflicting visit at this time');

    // Check client overlap excluding current visit
    const clientOverlap = await this.visitModel.findOne({
      clientId: visit.clientId,
      deletedAt: null,
      _id: { $ne: id },
      startUtc: { $lt: end.toJSDate() },
      endUtc: { $gt: start.toJSDate() },
    });
    if (clientOverlap)
      throw new ConflictException(
        'Client has a conflicting visit at this time',
      );

    visit.startUtc = start.toJSDate();
    visit.endUtc = end.toJSDate();
    if (updateVisitDto.note !== undefined) visit.notes = updateVisitDto.note;
    visit.status = VisitStatus.REQUESTING;

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForStatus(
      savedVisit,
      EMAIL_JOBS.VISIT_RESCHEDULED,
    );

    return savedVisit;
  }

  async propertyVisitList(
    propertyId: string,
    fromIso?: string,
    toIso?: string,
  ) {
    isValidObjectId(propertyId);

    const query: any = { propertyId, deletedAt: null };

    if (fromIso && toIso) {
      query.startUtc = {
        $lt: luxon.DateTime.fromISO(toIso).toUTC().toJSDate(),
      };
      query.endUtc = {
        $gt: luxon.DateTime.fromISO(fromIso).toUTC().toJSDate(),
      };
    }

    return await this.visitModel.find(query).sort('startUtc');
  }

  async cancel(id: string): Promise<Visit> {
    return this.changeStatus(id, { status: VisitStatus.CANCELED });
  }

  async softDelete(id: string): Promise<Visit> {
    const visit = await this.visitModel.findById(id);
    if (!visit) throw new NotFoundException('No visit with the provided id');

    visit.deletedAt = new Date();
    return await visit.save();
  }

  private async confirmIdsIndatabase(
    propertyId: string,
    agentId: string,
    clientId: string,
  ) {
    // These will throw if not found, so no need for manual checks
    await this.propertiesService.findOne(propertyId);
    await this.userModel.findOne(agentId);
    await this.userModel.findOne(clientId);
  }

  private getVisitDateString(date: Date) {
    return (
      luxon.DateTime.fromJSDate(date)
        .toUTC()
        .toLocaleString(luxon.DateTime.DATETIME_MED) + ' UTC'
    );
  }

  private async emitVisitNotificationForCreate(
    visit: Visit,
    agentId: string,
    clientId: string,
    propertyId: string,
    note: string | undefined,
    status: VisitStatus,
  ) {
    const [agent, client, property] = await Promise.all([
      this.userModel.findOne(agentId),
      this.userModel.findOne(clientId),
      this.propertiesService.findOne(propertyId, false),
    ]);

    const startDate = this.getVisitDateString(visit.startUtc);
    const endDate = this.getVisitDateString(visit.endUtc);

    const jobs: any = [];
    if (status === VisitStatus.SCHEDULED) {
      jobs.push(
        this.queueVisitNotification(
          EMAIL_JOBS.VISIT_SCHEDULED,
          agent,
          property,
          visit,
          note,
          startDate,
          endDate,
        ),
        this.queueVisitNotification(
          EMAIL_JOBS.VISIT_SCHEDULED,
          client,
          property,
          visit,
          note,
          startDate,
          endDate,
        ),
      );
    } else {
      jobs.push(
        this.queueVisitNotification(
          EMAIL_JOBS.VISIT_REQUESTED,
          agent,
          property,
          visit,
          note,
          startDate,
          endDate,
        ),
        this.queueVisitNotification(
          EMAIL_JOBS.VISIT_REQUESTED,
          client,
          property,
          visit,
          note,
          startDate,
          endDate,
        ),
      );
    }

    await Promise.all(jobs);
  }

  private async emitVisitNotificationForStatus(visit: Visit, jobName: string) {
    const [agent, client, property] = await Promise.all([
      this.userModel.findOne(visit.agentId.toString()),
      this.userModel.findOne(visit.clientId.toString()),
      this.propertiesService.findOne(visit.propertyId.toString(), false),
    ]);

    await Promise.all([
      this.queueVisitNotification(jobName, agent, property, visit, visit.notes),
      this.queueVisitNotification(
        jobName,
        client,
        property,
        visit,
        visit.notes,
      ),
    ]);
  }

  private async queueVisitNotification(
    jobName: string,
    user: any,
    property: any,
    visit: Visit,
    note?: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.queuesService.queueEmail(jobName, {
      email: user.email,
      recipientName: `${user.firstName} ${user.lastName}`,
      propertyTitle: property.title,
      propertyAddress: property.address,
      startDate: startDate ?? this.getVisitDateString(visit.startUtc),
      endDate: endDate ?? this.getVisitDateString(visit.endUtc),
      note,
    });
  }

  private assertValidWindow(start: luxon.DateTime, end: luxon.DateTime) {
    if (!start.isValid || !end.isValid)
      throw new BadRequestException('Invalid date format');
    if (end <= start) throw new BadRequestException('End must be after start');
    if (start < luxon.DateTime.utc())
      throw new BadRequestException('Start must be in the future');

    const visitDuration = 2;

    if (end.diff(start, 'hours').hours > visitDuration)
      throw new BadRequestException('Visit duration must be <= 2 hours');
  }
}
