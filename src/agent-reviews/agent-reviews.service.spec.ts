import { Test, TestingModule } from '@nestjs/testing';
import { AgentReviewsService } from './agent-reviews.service';
import { getModelToken } from '@nestjs/mongoose';
import { UsersService } from 'src/users/users.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { AgentReview } from './schema/agent-review.schema';

describe('AgentReviewsService', () => {
  let service: AgentReviewsService;
  let usersService: UsersService;
  let model: any;

  // This mock handles the "new model().save()" pattern
  function mockAgentReviewModel(dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'review_id', ...dto });
  }

  // Add static methods to the mock constructor
  mockAgentReviewModel.findOne = jest.fn();
  mockAgentReviewModel.find = jest.fn();
  mockAgentReviewModel.countDocuments = jest.fn();

  const mockUser = {_id: "u1"}

  const mockReviewDto = {
      userId: 'u1',
      agentId: 'a1',
      rating: 4,
      comment: 'c1',
    };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentReviewsService,
        {
          provide: getModelToken(AgentReview.name),
          useValue: mockAgentReviewModel,
        },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<AgentReviewsService>(AgentReviewsService);
    usersService = module.get<UsersService>(UsersService);
    model = module.get(getModelToken(AgentReview.name))
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('creat', () => {
    it('should throw BadRequestException if user not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValueOnce(null);

      await expect(service.create(mockReviewDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if agent not found', async () => {
      (usersService.findOne as jest.Mock)
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(null);

      await expect(service.create(mockReviewDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('Should throw ConflictException if user already reviewed agent', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);
      model.findOne.mockResolvedValue({ _id: 'testReview' });

      await expect(service.create(mockReviewDto)).rejects.toThrow(
        ConflictException,
      );
    });

    it("Create and save new review", async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser)
      model.findOne.mockResolvedValue(null)

      const result = await service.create(mockReviewDto)

      expect(result).toBeDefined();
      expect(result.userId).toEqual(mockReviewDto.userId);
      expect(usersService.findOne).toHaveBeenCalledTimes(2);
    })
  });

  describe("findAll", () => {
    it("Should return pagenated review", async () => {
      model.find.mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockResolvedValue([mockReviewDto]),
    }),
  });
      model.countDocuments.mockResolvedValue(1)

      const result = await service.findAll({page: 1, limit: 10})
      expect(result.data).toEqual([mockReviewDto])
      expect(result.total).toBe(1)
      expect(result.totalPage).toBe(1)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
    })
  })
});
