import { Test, TestingModule } from '@nestjs/testing';
import { PropertyReviewsController } from './property-reviews.controller';
import { PropertyReviewsService } from './property-reviews.service';

describe('PropertyReviewsController', () => {
  let controller: PropertyReviewsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PropertyReviewsController],
      providers: [PropertyReviewsService],
    }).compile();

    controller = module.get<PropertyReviewsController>(PropertyReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
