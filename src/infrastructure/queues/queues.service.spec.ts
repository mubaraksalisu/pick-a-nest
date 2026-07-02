import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueuesService } from './queues.service';
import { QUEUES } from './queue.constants';

describe('QueuesService', () => {
  let service: QueuesService;

  const mockEmailQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        { provide: getQueueToken(QUEUES.EMAIL), useValue: mockEmailQueue },
      ],
    }).compile();

    service = module.get<QueuesService>(QueuesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
