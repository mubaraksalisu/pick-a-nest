import { Test, TestingModule } from '@nestjs/testing';
import { AgentReviewsService } from './agent-reviews.service';

describe('AgentReviewsService', () => {
  let service: AgentReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AgentReviewsService],
    }).compile();

    service = module.get<AgentReviewsService>(AgentReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
