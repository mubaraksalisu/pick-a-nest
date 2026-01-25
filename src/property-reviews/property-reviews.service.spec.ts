import { UsersService } from 'src/users/users.service';
import { PropertyReviewsService } from './property-reviews.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PropertyReview } from './schemas/property-review.schema';

describe('PropertyReviewsService', () => {
  let service: PropertyReviewsService;
  let userService: UsersService;
  let model: any;

  // This mock handles the "new model().save()" pattern
  function mockPropertyReviewModel(dto: any) {
    this.data = dto;
    this.save = jest.fn().mockResolvedValue({ _id: 'id', ...dto });
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyReviewsService,
        {
          provide: getModelToken(PropertyReview.name),
          useValue: mockPropertyReviewModel,
        },
        { provide: UsersService, useValue: { findOne: jest.fn() } },
      ],
    }).compile();

    service = module.get<PropertyReviewsService>(PropertyReviewsService);
    userService = module.get<UsersService>(UsersService);
    model = module.get(getModelToken(PropertyReview.name));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should be defined', () => {
    expect(service).toBeDefined();
  });
});
