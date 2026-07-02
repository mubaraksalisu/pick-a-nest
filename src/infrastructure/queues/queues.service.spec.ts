import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';
import { QUEUES } from './queue.constants';

describe('QueuesService', () => {
  let service: QueuesService;
  let mockEmailQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockEmailQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        { provide: getQueueToken(QUEUES.EMAIL), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<QueuesService>(QueuesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToQueue', () => {
    it('should add a job with the default retry/cleanup options and return its id', async () => {
      const queue: any = { add: jest.fn().mockResolvedValue({ id: 'job-2' }) };

      const result = await service.addToQueue(queue, 'job-name', {
        foo: 'bar',
      });

      expect(queue.add).toHaveBeenCalledWith(
        'job-name',
        { foo: 'bar' },
        {
          attempts: 3,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
      expect(result).toEqual({ jobId: 'job-2' });
    });

    it('should let caller-supplied options override the defaults', async () => {
      const queue: any = { add: jest.fn().mockResolvedValue({ id: 'job-3' }) };

      await service.addToQueue(
        queue,
        'job-name',
        { foo: 'bar' },
        { attempts: 5, delay: 1000 },
      );

      expect(queue.add).toHaveBeenCalledWith(
        'job-name',
        { foo: 'bar' },
        {
          attempts: 5,
          backoff: 5000,
          removeOnComplete: true,
          removeOnFail: true,
          delay: 1000,
        },
      );
    });
  });

  describe('queueEmail', () => {
    it('should delegate to addToQueue using the injected email queue', async () => {
      const result = await service.queueEmail('verify-email', {
        email: 'a@example.com',
      });

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'verify-email',
        { email: 'a@example.com' },
        expect.objectContaining({ attempts: 3 }),
      );
      expect(result).toEqual({ jobId: 'job-1' });
    });

    it('should forward options such as delay to the underlying queue', async () => {
      await service.queueEmail(
        'visit-reminder',
        { email: 'a@example.com' },
        { delay: 5000 },
      );

      expect(mockEmailQueue.add).toHaveBeenCalledWith(
        'visit-reminder',
        { email: 'a@example.com' },
        expect.objectContaining({ delay: 5000 }),
      );
    });
  });
});
