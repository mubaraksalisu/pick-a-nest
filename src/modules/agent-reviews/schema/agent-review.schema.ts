import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class AgentReview extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  agentId: string;

  @Prop({
    type: Number,
    min: 1,
    max: 5,
    required: true,
  })
  rating: number;

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 255,
  })
  comment: string;
}

export const AgentReviewSchema = SchemaFactory.createForClass(AgentReview);
