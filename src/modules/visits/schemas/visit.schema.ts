import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Visit extends Document {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  agentId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  customerId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Property',
    required: true,
  })
  propertyId: Types.ObjectId;

  @Prop({
    type: Date,
    required: true,
  })
  visitDate: Date;

  @Prop({
    type: String,
    required: true,
  })
  startTime: string;

  @Prop({
    type: String,
    required: true,
  })
  endTime: string;

  @Prop({
    type: Date,
    required: true,
  })
  startUtc: Date;

  @Prop({
    type: Date,
    required: true,
  })
  endUtc: Date;

  @Prop({
    type: String,
    maxlength: 256,
  })
  notes?: string;

  @Prop({
    type: String,
    maxlength: 256,
  })
  cancellationReason?: string;

  @Prop({
    type: {
      rating: Number,
      comment: String,
    },
  })
  feedback?: {
    rating: number;
    comment?: string;
  };

  @Prop({
    type: String,
    enum: [
      'pending',
      'confirmed',
      'rescheduled',
      'completed',
      'cancelled',
      'no_show',
    ],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Date })
  confirmedAt?: Date;

  @Prop({ type: Date })
  completedAt?: Date;

  @Prop({ type: Date })
  cancelledAt?: Date;

  @Prop({ type: Date })
  rescheduledAt?: Date;

  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ propertyId: 1, startUtc: 1, endUtc: 1 });
VisitSchema.index({ agentId: 1, startUtc: 1, endUtc: 1 });
VisitSchema.index({ customerId: 1, startUtc: 1, endUtc: 1 });
VisitSchema.index({ status: 1 });
