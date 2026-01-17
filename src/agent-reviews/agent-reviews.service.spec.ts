import { Test, TestingModule } from '@nestjs/testing';
import { AgentReviewsService } from './agent-reviews.service';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from 'src/users/users.service';

// Mock Mongoose Model
const mockAgentReviewModel = {
  findOne: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  findById: jest.fn(),
  findByIdAndDelete: jest.fn(),
  save: jest.fn(),
};

describe('AgentReviewsService', () => {
  let service: AgentReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentReviewsService,
        {
          provide: getModelToken('AgentReview'),
          useValue: mockAgentReviewModel,
        },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<AgentReviewsService>(AgentReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
