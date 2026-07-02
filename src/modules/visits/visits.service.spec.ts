import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import * as luxon from 'luxon';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
// VisitsService pulls in PropertiesService -> AwsS3Service -> uuid (ESM-only,
// not transformed by ts-jest). Mock it out before import so the real chain
// never loads, matching properties.service.spec.ts.
jest.mock('src/infrastructure/aws-s3/aws-s3.service', () => ({
  AwsS3Service: jest.fn().mockImplementation(() => ({
    getPublicUrl: jest.fn().mockReturnValue('url'),
  })),
}));
import { VisitsService } from './visits.service';
import { Visit } from './schemas/visit.schema';
import { VisitStatus } from './dto/create-visit.dto';
import { PropertiesService } from 'src/modules/properties/properties.service';
import { UsersService } from 'src/modules/users/users.service';
import { QueuesService } from 'src/infrastructure/queues/queues.service';
import { EMAIL_JOBS } from 'src/infrastructure/queues/queue.constants';

describe('VisitsService', () => {
  let service: VisitsService;
  let visitModel: any;
  let propertiesService: any;
  let usersService: any;
  let queuesService: any;

  const propertyId = '507f1f77bcf86cd799439011';
  const agentId = '507f1f77bcf86cd799439012';
  const customerId = '507f1f77bcf86cd799439013';
  const visitId = '507f1f77bcf86cd799439014';

  const futureDate = (daysFromNow = 2) =>
    luxon.DateTime.utc().plus({ days: daysFromNow }).toFormat('yyyy-MM-dd');

  const buildCreateDto = (overrides: Record<string, any> = {}) => ({
    propertyId,
    agentId,
    customerId,
    visitDate: futureDate(),
    startTime: '10:00',
    endTime: '11:00',
    note: 'looking forward to it',
    ...overrides,
  });

  const buildVisitDoc = (overrides: Record<string, any> = {}) => {
    const doc: any = {
      _id: visitId,
      agentId,
      customerId,
      propertyId,
      startUtc: luxon.DateTime.utc().plus({ days: 2 }).toJSDate(),
      endUtc: luxon.DateTime.utc().plus({ days: 2, hours: 1 }).toJSDate(),
      startTime: '10:00',
      endTime: '11:00',
      notes: 'note',
      status: VisitStatus.PENDING,
      deletedAt: null,
      ...overrides,
    };
    doc.save = jest.fn().mockResolvedValue(doc);
    return doc;
  };

  // find().sort('startUtc') - resolves directly, no further chaining
  const createSortOnlyChain = (result: any[]) => ({
    sort: jest.fn().mockResolvedValue(result),
  });

  // find().sort({...}).skip().limit() - used by the paginated helpers
  const createPaginatedChain = (result: any[]) => ({
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    visitModel = jest.fn(function (this: any, dto: any) {
      Object.assign(this, dto);
      this.save = jest.fn().mockImplementation(() => Promise.resolve(this));
    });
    visitModel.findOne = jest.fn().mockResolvedValue(null);
    visitModel.findById = jest.fn();
    visitModel.find = jest.fn();
    visitModel.countDocuments = jest.fn();

    propertiesService = {
      findOne: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          _id: id,
          title: 'Test Property',
          address: '123 Main St',
        }),
      ),
    };

    usersService = {
      findOne: jest.fn().mockImplementation((id: string) =>
        Promise.resolve({
          _id: id,
          email: `${id}@test.com`,
          firstName: 'First',
          lastName: 'Last',
        }),
      ),
    };

    queuesService = {
      queueEmail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VisitsService,
        { provide: getModelToken(Visit.name), useValue: visitModel },
        { provide: PropertiesService, useValue: propertiesService },
        { provide: UsersService, useValue: usersService },
        { provide: QueuesService, useValue: queuesService },
      ],
    }).compile();

    service = module.get<VisitsService>(VisitsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a visit, persist it, and notify both agent and customer', async () => {
      const result: any = await service.create(buildCreateDto() as any);

      expect(propertiesService.findOne).toHaveBeenCalledWith(propertyId);
      expect(usersService.findOne).toHaveBeenCalledWith(agentId);
      expect(usersService.findOne).toHaveBeenCalledWith(customerId);
      expect(result.status).toBe(VisitStatus.PENDING);
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_REQUESTED,
        expect.objectContaining({ email: `${agentId}@test.com` }),
      );
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_REQUESTED,
        expect.objectContaining({ email: `${customerId}@test.com` }),
      );
    });

    it('should return the existing visit without reprocessing when idempotencyKey matches', async () => {
      const existingVisit = { _id: 'existing-visit', idempotencyKey: 'key-1' };
      visitModel.findOne.mockResolvedValueOnce(existingVisit);

      const result = await service.create(
        buildCreateDto({ idempotencyKey: 'key-1' }) as any,
      );

      expect(result).toBe(existingVisit);
      expect(propertiesService.findOne).not.toHaveBeenCalled();
      expect(usersService.findOne).not.toHaveBeenCalled();
      expect(queuesService.queueEmail).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for an invalid object id', async () => {
      await expect(
        service.create(buildCreateDto({ propertyId: 'not-an-id' }) as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when end time is not after start time', async () => {
      await expect(
        service.create(
          buildCreateDto({ startTime: '11:00', endTime: '10:00' }) as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the visit start is in the past', async () => {
      await expect(
        service.create(buildCreateDto({ visitDate: futureDate(-2) }) as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when the visit duration exceeds 4 hours', async () => {
      await expect(
        service.create(
          buildCreateDto({ startTime: '08:00', endTime: '13:00' }) as any,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when the property already has an overlapping visit', async () => {
      visitModel.findOne.mockResolvedValueOnce({ _id: 'other-visit' });

      await expect(service.create(buildCreateDto() as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when the agent has a conflicting visit', async () => {
      visitModel.findOne
        .mockResolvedValueOnce(null) // property check passes
        .mockResolvedValueOnce({ _id: 'other-visit' }); // agent check conflicts

      await expect(service.create(buildCreateDto() as any)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw ConflictException when the customer has a conflicting visit', async () => {
      visitModel.findOne
        .mockResolvedValueOnce(null) // property check passes
        .mockResolvedValueOnce(null) // agent check passes
        .mockResolvedValueOnce({ _id: 'other-visit' }); // customer check conflicts

      await expect(service.create(buildCreateDto() as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('confirm', () => {
    it('should confirm a pending visit, schedule a reminder, and notify both parties', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.confirm(visitId);

      expect(visit.status).toBe(VisitStatus.CONFIRMED);
      expect(visit.confirmedAt).toBeInstanceOf(Date);
      expect(visit.save).toHaveBeenCalled();
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_CONFIRMED,
        expect.anything(),
      );
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_REMINDER,
        expect.anything(),
        expect.objectContaining({ delay: expect.any(Number) }),
      );
    });

    it('should throw BadRequestException when the visit is not pending or rescheduled', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.COMPLETED });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(service.confirm(visitId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('complete', () => {
    it('should complete a confirmed visit', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.CONFIRMED });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.complete(visitId);

      expect(visit.status).toBe(VisitStatus.COMPLETED);
      expect(visit.completedAt).toBeInstanceOf(Date);
      expect(visit.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when the visit is not confirmed or rescheduled', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(service.complete(visitId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel a visit and record the reason', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.cancel(visitId, { reason: 'change of plans' });

      expect(visit.status).toBe(VisitStatus.CANCELLED);
      expect(visit.cancellationReason).toBe('change of plans');
      expect(visit.cancelledAt).toBeInstanceOf(Date);
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_CANCELED,
        expect.anything(),
      );
    });

    it('should throw BadRequestException when the visit is already in a terminal state', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.COMPLETED });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.cancel(visitId, { reason: 'too late' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should throw BadRequestException for an invalid id', async () => {
      await expect(service.findOne('not-an-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when the visit does not exist', async () => {
      visitModel.findById.mockResolvedValueOnce(null);

      await expect(service.findOne(visitId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when the visit is soft-deleted', async () => {
      visitModel.findById.mockResolvedValueOnce(
        buildVisitDoc({ deletedAt: new Date() }),
      );

      await expect(service.findOne(visitId)).rejects.toThrow(NotFoundException);
    });

    it('should return the visit when found', async () => {
      const visit = buildVisitDoc();
      visitModel.findById.mockResolvedValueOnce(visit);

      const result = await service.findOne(visitId);

      expect(result).toBe(visit);
    });
  });

  describe('reschedule', () => {
    it('should reschedule a pending visit to a new window', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.reschedule(visitId, {
        visitDate: futureDate(3),
        startTime: '14:00',
        endTime: '15:00',
        note: 'moved',
      } as any);

      expect(visit.status).toBe(VisitStatus.RESCHEDULED);
      expect(visit.startTime).toBe('14:00');
      expect(visit.notes).toBe('moved');
      expect(visit.save).toHaveBeenCalled();
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_RESCHEDULED,
        expect.anything(),
      );
    });

    it('should throw BadRequestException when the visit is in a terminal state', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.CANCELLED });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.reschedule(visitId, {
          visitDate: futureDate(3),
          startTime: '14:00',
          endTime: '15:00',
        } as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when the new window overlaps another visit', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);
      visitModel.findOne.mockResolvedValueOnce({ _id: 'other-visit' });

      await expect(
        service.reschedule(visitId, {
          visitDate: futureDate(3),
          startTime: '14:00',
          endTime: '15:00',
        } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('propertyVisitList', () => {
    it('should throw BadRequestException for an invalid property id', async () => {
      await expect(service.propertyVisitList('not-an-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should list visits for a property filtered by date range', async () => {
      const chain = createSortOnlyChain([buildVisitDoc()]);
      visitModel.find.mockReturnValueOnce(chain);

      const result = await service.propertyVisitList(
        propertyId,
        '2025-01-01',
        '2025-01-31',
      );

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ propertyId, deletedAt: null }),
      );
      expect(chain.sort).toHaveBeenCalledWith('startUtc');
      expect(result).toHaveLength(1);
    });
  });

  describe('findMyVisits', () => {
    it('should paginate visits filtered by customer', async () => {
      const chain = createPaginatedChain([buildVisitDoc()]);
      visitModel.find.mockReturnValueOnce(chain);
      visitModel.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findMyVisits(customerId, {
        page: 1,
        limit: 10,
      } as any);

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ customerId, deletedAt: null }),
      );
      expect(result.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findAgentVisits', () => {
    it('should paginate visits filtered by agent', async () => {
      const chain = createPaginatedChain([buildVisitDoc()]);
      visitModel.find.mockReturnValueOnce(chain);
      visitModel.countDocuments.mockResolvedValueOnce(1);

      await service.findAgentVisits(agentId, { page: 1, limit: 10 } as any);

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({ agentId, deletedAt: null }),
      );
    });
  });

  describe('findUpcoming', () => {
    it('should query upcoming visits for either role within the date window', async () => {
      const chain = createSortOnlyChain([buildVisitDoc()]);
      visitModel.find.mockReturnValueOnce(chain);

      const result = await service.findUpcoming(customerId, 7);

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: [{ customerId }, { agentId: customerId }],
          status: {
            $in: [
              VisitStatus.PENDING,
              VisitStatus.CONFIRMED,
              VisitStatus.RESCHEDULED,
            ],
          },
        }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findHistory', () => {
    it('should return only terminal-status visits for the participant', async () => {
      const chain = createPaginatedChain([
        buildVisitDoc({ status: VisitStatus.COMPLETED }),
      ]);
      visitModel.find.mockReturnValueOnce(chain);
      visitModel.countDocuments.mockResolvedValueOnce(1);

      const result = await service.findHistory(customerId, {
        page: 1,
        limit: 10,
      } as any);

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: {
            $in: [
              VisitStatus.COMPLETED,
              VisitStatus.CANCELLED,
              VisitStatus.NO_SHOW,
            ],
          },
        }),
      );
      expect(result.total).toBe(1);
    });
  });

  describe('findAllForAdmin', () => {
    it('should build filters from all supported query params', async () => {
      const chain = createPaginatedChain([]);
      visitModel.find.mockReturnValueOnce(chain);
      visitModel.countDocuments.mockResolvedValueOnce(0);

      await service.findAllForAdmin({
        status: VisitStatus.CONFIRMED,
        agentId,
        propertyId,
        customerId,
        fromDate: '2025-01-01',
        toDate: '2025-01-31',
        page: 1,
        limit: 10,
      } as any);

      expect(visitModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: VisitStatus.CONFIRMED,
          agentId,
          propertyId,
          customerId,
          deletedAt: null,
        }),
      );
    });
  });

  describe('getStats', () => {
    it('should aggregate visit counts by status', async () => {
      visitModel.countDocuments
        .mockResolvedValueOnce(1) // pending
        .mockResolvedValueOnce(2) // confirmed
        .mockResolvedValueOnce(3) // rescheduled
        .mockResolvedValueOnce(4) // completed
        .mockResolvedValueOnce(5) // cancelled
        .mockResolvedValueOnce(6) // noShow
        .mockResolvedValueOnce(21); // total

      const result = await service.getStats();

      expect(result).toEqual({
        total: 21,
        pending: 1,
        confirmed: 2,
        rescheduled: 3,
        completed: 4,
        cancelled: 5,
        noShow: 6,
      });
    });
  });

  describe('addFeedback', () => {
    it('should allow the booking customer to add feedback on a completed visit', async () => {
      const visit = buildVisitDoc({
        status: VisitStatus.COMPLETED,
        customerId,
      });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.addFeedback(
        visitId,
        { rating: 5, comment: 'Great!' },
        customerId,
      );

      expect(visit.feedback).toEqual({ rating: 5, comment: 'Great!' });
      expect(visit.save).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when a non-customer submits feedback', async () => {
      const visit = buildVisitDoc({
        status: VisitStatus.COMPLETED,
        customerId,
      });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.addFeedback(visitId, { rating: 5 } as any, 'someone-else'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when the visit is not completed', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING, customerId });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.addFeedback(visitId, { rating: 5 } as any, customerId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDeleteVisit', () => {
    it('should set deletedAt on the visit', async () => {
      const visit = buildVisitDoc();
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.softDeleteVisit(visitId);

      expect(visit.deletedAt).toBeInstanceOf(Date);
      expect(visit.save).toHaveBeenCalled();
    });
  });

  describe('changeStatus', () => {
    it('should allow a valid transition and schedule a reminder when moving to confirmed', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await service.changeStatus(visitId, { status: VisitStatus.CONFIRMED });

      expect(visit.status).toBe(VisitStatus.CONFIRMED);
      expect(visit.confirmedAt).toBeInstanceOf(Date);
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_CONFIRMED,
        expect.anything(),
      );
      expect(queuesService.queueEmail).toHaveBeenCalledWith(
        EMAIL_JOBS.VISIT_REMINDER,
        expect.anything(),
        expect.anything(),
      );
    });

    it('should throw BadRequestException for a disallowed transition', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.PENDING });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.changeStatus(visitId, { status: VisitStatus.COMPLETED }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for transitions out of a terminal state', async () => {
      const visit = buildVisitDoc({ status: VisitStatus.CANCELLED });
      visitModel.findById.mockResolvedValueOnce(visit);

      await expect(
        service.changeStatus(visitId, { status: VisitStatus.CONFIRMED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
