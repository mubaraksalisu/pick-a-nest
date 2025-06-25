import { Test, TestingModule } from '@nestjs/testing';
import { PropertyReviewsService } from './property-reviews.service';

describe('PropertyReviewsService', () => {
  let service: PropertyReviewsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PropertyReviewsService],
    }).compile();

    service = module.get<PropertyReviewsService>(PropertyReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
