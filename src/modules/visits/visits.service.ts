import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ChangeStatusDto,
  CreateVisitDto,
  VisitStatus,
} from './dto/create-visit.dto';
import { UpdateVisitDto } from './dto/update-visit.dto';
import { CancelVisitDto } from './dto/cancel-visit.dto';
import { FeedbackVisitDto } from './dto/feedback-visit.dto';
import { VisitQueryDto } from './dto/visit-query.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Visit } from './schemas/visit.schema';
import { FilterQuery, Model } from 'mongoose';
import * as luxon from 'luxon';
import { PropertiesService } from 'src/modules/properties/properties.service';
import { UsersService } from 'src/modules/users/users.service';
import { QueuesService } from 'src/infrastructure/queues/queues.service';
import { EMAIL_JOBS } from 'src/infrastructure/queues/queue.constants';
import { isValidObjectId } from 'src/shared/utils/isValidObjectId.util';

@Injectable()
export class VisitsService {
  constructor(
    @InjectModel(Visit.name) private visitModel: Model<Visit>,
    private propertiesService: PropertiesService,
    private usersService: UsersService,
    private readonly queuesService: QueuesService,
  ) {}

  async create(
    createVisitDto: CreateVisitDto & { customerId: string },
  ): Promise<Visit> {
    const {
      propertyId,
      agentId,
      customerId,
      visitDate,
      startTime,
      endTime,
      idempotencyKey,
      note,
    } = createVisitDto;

    this.assertValidObjectIds([propertyId, agentId, customerId]);

    if (idempotencyKey) {
      const existing = await this.visitModel.findOne({ idempotencyKey });
      if (existing) return existing;
    }

    await this.confirmIdsInDatabase(propertyId, agentId, customerId);

    const { startUtc, endUtc, visitDateValue, start, end } =
      this.parseVisitWindow(visitDate, startTime, endTime);
    this.assertValidWindow(start, end);

    await this.assertNoSchedulingConflicts({
      propertyId,
      agentId,
      customerId,
      startUtc,
      endUtc,
    });

    const visit = new this.visitModel({
      agentId,
      customerId,
      propertyId,
      visitDate: visitDateValue,
      startTime,
      endTime,
      startUtc,
      endUtc,
      notes: note,
      status: VisitStatus.PENDING,
      idempotencyKey,
    });

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForCreate(
      savedVisit,
      agentId,
      customerId,
      propertyId,
      note,
      VisitStatus.PENDING,
    );

    return savedVisit;
  }

  async confirm(id: string): Promise<Visit> {
    const visit = await this.findOne(id);
    if (
      ![VisitStatus.PENDING, VisitStatus.RESCHEDULED].includes(visit.status)
    ) {
      throw new BadRequestException(
        'Only pending or rescheduled visits can be confirmed',
      );
    }

    visit.status = VisitStatus.CONFIRMED;
    visit.confirmedAt = new Date();

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForStatus(
      savedVisit,
      EMAIL_JOBS.VISIT_CONFIRMED,
    );
    await this.scheduleVisitReminder(savedVisit);

    return savedVisit;
  }

  async complete(id: string): Promise<Visit> {
    const visit = await this.findOne(id);
    if (
      ![VisitStatus.CONFIRMED, VisitStatus.RESCHEDULED].includes(visit.status)
    ) {
      throw new BadRequestException(
        'Only confirmed or rescheduled visits can be completed',
      );
    }

    visit.status = VisitStatus.COMPLETED;
    visit.completedAt = new Date();

    return await visit.save();
  }

  async cancel(id: string, cancelVisitDto: CancelVisitDto): Promise<Visit> {
    const visit = await this.findOne(id);
    if (
      [
        VisitStatus.CANCELLED,
        VisitStatus.COMPLETED,
        VisitStatus.NO_SHOW,
      ].includes(visit.status)
    ) {
      throw new BadRequestException(
        'Visit cannot be cancelled in current state',
      );
    }

    visit.status = VisitStatus.CANCELLED;
    visit.cancellationReason = cancelVisitDto.reason;
    visit.cancelledAt = new Date();

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForStatus(
      savedVisit,
      EMAIL_JOBS.VISIT_CANCELED,
    );

    return savedVisit;
  }

  async findOne(id: string): Promise<Visit> {
    this.assertValidObjectIds([id]);

    const visit = await this.visitModel.findById(id);
    if (!visit || visit.deletedAt)
      throw new NotFoundException('No visit with the provided id');

    return visit;
  }

  async reschedule(id: string, updateVisitDto: UpdateVisitDto): Promise<Visit> {
    const visit = await this.findOne(id);

    if (
      [
        VisitStatus.COMPLETED,
        VisitStatus.CANCELLED,
        VisitStatus.NO_SHOW,
      ].includes(visit.status)
    ) {
      throw new BadRequestException(
        'Only pending, confirmed, or rescheduled visits can be rescheduled',
      );
    }

    const { startUtc, endUtc, visitDateValue, start, end } =
      this.parseVisitWindow(
        updateVisitDto.visitDate,
        updateVisitDto.startTime,
        updateVisitDto.endTime,
      );
    this.assertValidWindow(start, end);

    await this.assertNoSchedulingConflicts({
      propertyId: visit.propertyId.toString(),
      agentId: visit.agentId.toString(),
      customerId: visit.customerId.toString(),
      startUtc,
      endUtc,
      excludeId: id,
    });

    visit.visitDate = visitDateValue;
    visit.startTime = updateVisitDto.startTime;
    visit.endTime = updateVisitDto.endTime;
    visit.startUtc = startUtc;
    visit.endUtc = endUtc;
    if (updateVisitDto.note !== undefined) visit.notes = updateVisitDto.note;
    visit.status = VisitStatus.RESCHEDULED;
    visit.rescheduledAt = new Date();

    const savedVisit = await visit.save();
    await this.emitVisitNotificationForStatus(
      savedVisit,
      EMAIL_JOBS.VISIT_RESCHEDULED,
    );

    return savedVisit;
  }

  async propertyVisitList(
    propertyId: string,
    fromDate?: string,
    toDate?: string,
  ) {
    this.assertValidObjectIds([propertyId]);

    const query: any = { propertyId, deletedAt: null };

    if (fromDate) {
      query.endUtc = {
        ...query.endUtc,
        $gt: luxon.DateTime.fromISO(fromDate).toUTC().toJSDate(),
      };
    }

    if (toDate) {
      query.startUtc = {
        ...query.startUtc,
        $lt: luxon.DateTime.fromISO(toDate).toUTC().toJSDate(),
      };
    }

    return await this.visitModel.find(query).sort('startUtc');
  }

  async findMyVisits(userId: string, query: VisitQueryDto) {
    return this.findByParticipant({ customerId: userId }, query);
  }

  async findAgentVisits(agentId: string, query: VisitQueryDto) {
    return this.findByParticipant({ agentId }, query);
  }

  async findUpcoming(userId: string, days = 7) {
    const start = luxon.DateTime.utc().toJSDate();
    const end = luxon.DateTime.utc().plus({ days }).toJSDate();

    return this.visitModel
      .find({
        deletedAt: null,
        startUtc: { $gte: start, $lte: end },
        $or: [{ customerId: userId }, { agentId: userId }],
        status: {
          $in: [
            VisitStatus.PENDING,
            VisitStatus.CONFIRMED,
            VisitStatus.RESCHEDULED,
          ],
        },
      })
      .sort('startUtc');
  }

  async findHistory(userId: string, query: VisitQueryDto) {
    const historyStatuses = [
      VisitStatus.COMPLETED,
      VisitStatus.CANCELLED,
      VisitStatus.NO_SHOW,
    ];

    const filters: any = {
      deletedAt: null,
      status: { $in: historyStatuses },
      $or: [{ customerId: userId }, { agentId: userId }],
    };

    return this.findPaginated(filters, query);
  }

  async findAllForAdmin(query: VisitQueryDto) {
    const filters: any = { deletedAt: null };

    if (query.status) filters.status = query.status;
    if (query.agentId) filters.agentId = query.agentId;
    if (query.propertyId) filters.propertyId = query.propertyId;
    if (query.customerId) filters.customerId = query.customerId;
    if (query.fromDate) {
      filters.endUtc = {
        ...filters.endUtc,
        $gt: luxon.DateTime.fromISO(query.fromDate).toUTC().toJSDate(),
      };
    }
    if (query.toDate) {
      filters.startUtc = {
        ...filters.startUtc,
        $lt: luxon.DateTime.fromISO(query.toDate).toUTC().toJSDate(),
      };
    }

    return this.findPaginated(filters, query);
  }

  async getStats() {
    const base = { deletedAt: null };
    const [
      pending,
      confirmed,
      rescheduled,
      completed,
      cancelled,
      noShow,
      total,
    ] = await Promise.all([
      this.visitModel.countDocuments({ ...base, status: VisitStatus.PENDING }),
      this.visitModel.countDocuments({
        ...base,
        status: VisitStatus.CONFIRMED,
      }),
      this.visitModel.countDocuments({
        ...base,
        status: VisitStatus.RESCHEDULED,
      }),
      this.visitModel.countDocuments({
        ...base,
        status: VisitStatus.COMPLETED,
      }),
      this.visitModel.countDocuments({
        ...base,
        status: VisitStatus.CANCELLED,
      }),
      this.visitModel.countDocuments({ ...base, status: VisitStatus.NO_SHOW }),
      this.visitModel.countDocuments(base),
    ]);

    return {
      total,
      pending,
      confirmed,
      rescheduled,
      completed,
      cancelled,
      noShow,
    };
  }

  async addFeedback(
    id: string,
    feedbackVisitDto: FeedbackVisitDto,
    userId: string,
  ) {
    const visit = await this.findOne(id);
    if (visit.customerId.toString() !== userId) {
      throw new ForbiddenException(
        'Only the booking customer can submit feedback',
      );
    }

    if (visit.status !== VisitStatus.COMPLETED) {
      throw new BadRequestException(
        'Feedback can only be submitted for completed visits',
      );
    }

    visit.feedback = {
      rating: feedbackVisitDto.rating,
      comment: feedbackVisitDto.comment,
    };

    return visit.save();
  }

  async softDeleteVisit(id: string): Promise<Visit> {
    const visit = await this.findOne(id);

    visit.deletedAt = new Date();
    return await visit.save();
  }

  async changeStatus(
    id: string,
    changeStatusDto: ChangeStatusDto,
  ): Promise<Visit> {
    const visit = await this.findOne(id);

    const allowed: Record<string, VisitStatus[]> = {
      [VisitStatus.PENDING]: [VisitStatus.CONFIRMED, VisitStatus.CANCELLED],
      [VisitStatus.CONFIRMED]: [
        VisitStatus.CANCELLED,
        VisitStatus.COMPLETED,
        VisitStatus.RESCHEDULED,
      ],
      [VisitStatus.RESCHEDULED]: [VisitStatus.CONFIRMED, VisitStatus.CANCELLED],
      [VisitStatus.CANCELLED]: [],
      [VisitStatus.COMPLETED]: [],
      [VisitStatus.NO_SHOW]: [],
    };

    if (!allowed[visit.status].includes(changeStatusDto.status)) {
      throw new BadRequestException(
        `Invalid transition from ${visit.status} to ${changeStatusDto.status}`,
      );
    }

    visit.status = changeStatusDto.status;
    if (visit.status === VisitStatus.CONFIRMED) {
      visit.confirmedAt = new Date();
      await this.scheduleVisitReminder(visit);
    }
    if (visit.status === VisitStatus.COMPLETED) visit.completedAt = new Date();
    if (visit.status === VisitStatus.CANCELLED) visit.cancelledAt = new Date();
    if (visit.status === VisitStatus.RESCHEDULED)
      visit.rescheduledAt = new Date();

    const savedVisit = await visit.save();
    const notificationJob =
      savedVisit.status === VisitStatus.CONFIRMED
        ? EMAIL_JOBS.VISIT_CONFIRMED
        : savedVisit.status === VisitStatus.RESCHEDULED
          ? EMAIL_JOBS.VISIT_RESCHEDULED
          : savedVisit.status === VisitStatus.CANCELLED
            ? EMAIL_JOBS.VISIT_CANCELED
            : EMAIL_JOBS.VISIT_SCHEDULED;

    await this.emitVisitNotificationForStatus(savedVisit, notificationJob);

    return savedVisit;
  }

  private async findByParticipant(
    participantFilter: FilterQuery<Visit>,
    query: VisitQueryDto,
  ) {
    const filters: any = { deletedAt: null, ...participantFilter };
    if (query.status) filters.status = query.status;
    if (query.fromDate) {
      filters.endUtc = {
        ...filters.endUtc,
        $gt: luxon.DateTime.fromISO(query.fromDate).toUTC().toJSDate(),
      };
    }
    if (query.toDate) {
      filters.startUtc = {
        ...filters.startUtc,
        $lt: luxon.DateTime.fromISO(query.toDate).toUTC().toJSDate(),
      };
    }

    return this.findPaginated(filters, query);
  }

  private async findPaginated(
    filters: FilterQuery<Visit>,
    query: VisitQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.visitModel
        .find(filters)
        .sort({ startUtc: 1 })
        .skip(skip)
        .limit(limit),
      this.visitModel.countDocuments(filters),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPage: Math.ceil(total / limit),
    };
  }

  private assertValidObjectIds(ids: string[]) {
    const invalid = ids.filter((id) => !isValidObjectId(id));
    if (invalid.length) {
      throw new BadRequestException('Invalid object id provided');
    }
  }

  private parseVisitWindow(
    visitDate: string,
    startTime: string,
    endTime: string,
  ) {
    const start = luxon.DateTime.fromFormat(
      `${visitDate} ${startTime}`,
      'yyyy-MM-dd HH:mm',
      { zone: 'utc' },
    );
    const end = luxon.DateTime.fromFormat(
      `${visitDate} ${endTime}`,
      'yyyy-MM-dd HH:mm',
      { zone: 'utc' },
    );

    if (!start.isValid || !end.isValid) {
      throw new BadRequestException('Invalid visit date or time');
    }

    return {
      visitDateValue: luxon.DateTime.fromISO(visitDate, { zone: 'utc' })
        .startOf('day')
        .toJSDate(),
      start,
      end,
      startUtc: start.toUTC().toJSDate(),
      endUtc: end.toUTC().toJSDate(),
    };
  }

  private async assertNoSchedulingConflicts({
    propertyId,
    agentId,
    customerId,
    startUtc,
    endUtc,
    excludeId,
  }: {
    propertyId: string;
    agentId: string;
    customerId: string;
    startUtc: Date;
    endUtc: Date;
    excludeId?: string;
  }) {
    const common = {
      deletedAt: null,
      status: { $ne: VisitStatus.CANCELLED },
      startUtc: { $lt: endUtc },
      endUtc: { $gt: startUtc },
    };

    const excludeFilter = excludeId ? { _id: { $ne: excludeId } } : {};

    const propertyOverlap = await this.visitModel.findOne({
      propertyId,
      ...common,
      ...excludeFilter,
    });
    if (propertyOverlap) {
      throw new ConflictException(
        'Time slot overlaps with existing visit for this property',
      );
    }

    const agentOverlap = await this.visitModel.findOne({
      agentId,
      ...common,
      ...excludeFilter,
    });
    if (agentOverlap) {
      throw new ConflictException('Agent has a conflicting visit at this time');
    }

    const customerOverlap = await this.visitModel.findOne({
      customerId,
      ...common,
      ...excludeFilter,
    });
    if (customerOverlap) {
      throw new ConflictException(
        'Customer has a conflicting visit at this time',
      );
    }
  }

  private async confirmIdsInDatabase(
    propertyId: string,
    agentId: string,
    customerId: string,
  ) {
    await this.propertiesService.findOne(propertyId);
    await this.usersService.findOne(agentId);
    await this.usersService.findOne(customerId);
  }

  private getVisitDateString(date: Date) {
    return (
      luxon.DateTime.fromJSDate(date)
        .toUTC()
        .toLocaleString(luxon.DateTime.DATETIME_MED) + ' UTC'
    );
  }

  private async scheduleVisitReminder(visit: Visit) {
    const reminder = luxon.DateTime.fromJSDate(visit.startUtc).minus({
      hours: 24,
    });
    const delayMs = reminder.diffNow('milliseconds').milliseconds;
    const delay = Math.max(0, delayMs);

    const [agent, customer, property] = await Promise.all([
      this.usersService.findOne(visit.agentId.toString()),
      this.usersService.findOne(visit.customerId.toString()),
      this.propertiesService.findOne(visit.propertyId.toString(), false),
    ]);

    const startDate = this.getVisitDateString(visit.startUtc);
    const endDate = this.getVisitDateString(visit.endUtc);

    await Promise.all([
      this.queuesService.queueEmail(
        EMAIL_JOBS.VISIT_REMINDER,
        {
          email: agent.email,
          recipientName: `${agent.firstName} ${agent.lastName}`,
          propertyTitle: property.title,
          propertyAddress: property.address,
          startDate,
          endDate,
          note: visit.notes,
        },
        { delay },
      ),
      this.queuesService.queueEmail(
        EMAIL_JOBS.VISIT_REMINDER,
        {
          email: customer.email,
          recipientName: `${customer.firstName} ${customer.lastName}`,
          propertyTitle: property.title,
          propertyAddress: property.address,
          startDate,
          endDate,
          note: visit.notes,
        },
        { delay },
      ),
    ]);
  }

  private async emitVisitNotificationForCreate(
    visit: Visit,
    agentId: string,
    customerId: string,
    propertyId: string,
    note: string | undefined,
    status: VisitStatus,
  ) {
    const [agent, customer, property] = await Promise.all([
      this.usersService.findOne(agentId),
      this.usersService.findOne(customerId),
      this.propertiesService.findOne(propertyId, false),
    ]);

    const startDate = this.getVisitDateString(visit.startUtc);
    const endDate = this.getVisitDateString(visit.endUtc);

    const jobName =
      status === VisitStatus.CONFIRMED
        ? EMAIL_JOBS.VISIT_CONFIRMED
        : EMAIL_JOBS.VISIT_REQUESTED;

    await Promise.all([
      this.queueVisitNotification(
        jobName,
        agent,
        property,
        visit,
        note,
        startDate,
        endDate,
      ),
      this.queueVisitNotification(
        jobName,
        customer,
        property,
        visit,
        note,
        startDate,
        endDate,
      ),
    ]);
  }

  private async emitVisitNotificationForStatus(visit: Visit, jobName: string) {
    const [agent, customer, property] = await Promise.all([
      this.usersService.findOne(visit.agentId.toString()),
      this.usersService.findOne(visit.customerId.toString()),
      this.propertiesService.findOne(visit.propertyId.toString(), false),
    ]);

    await Promise.all([
      this.queueVisitNotification(jobName, agent, property, visit, visit.notes),
      this.queueVisitNotification(
        jobName,
        customer,
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

    const maximumDurationHours = 4;
    if (end.diff(start, 'hours').hours > maximumDurationHours)
      throw new BadRequestException(
        `Visit duration must be <= ${maximumDurationHours} hours`,
      );
  }
}
