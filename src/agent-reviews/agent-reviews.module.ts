import { Module } from '@nestjs/common';
import { AgentReviewsService } from './agent-reviews.service';
import { AgentReviewsController } from './agent-reviews.controller';
import { UsersModule } from 'src/users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentReview, AgentReviewSchema } from './schema/agent-review.schema';

@Module({
  imports: [
    UsersModule,
    MongooseModule.forFeature([
      { name: AgentReview.name, schema: AgentReviewSchema },
    ]),
  ],
  controllers: [AgentReviewsController],
  providers: [AgentReviewsService],
})
export class AgentReviewsModule {}
