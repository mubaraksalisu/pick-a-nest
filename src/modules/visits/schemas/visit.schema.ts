import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Visit extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  agentId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  clientId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Property',
    required: true,
  })
  propertyId: Types.ObjectId;

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
    enum: ['requesting', 'completed', 'canceled', 'scheduled'],
    default: 'requesting',
  })
  status: string;

  @Prop({ type: String, unique: true, sparse: true })
  idempotencyKey?: string;

  @Prop({ type: Date })
  deletedAt?: Date;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
VisitSchema.index({ propertyId: 1, startUtc: 1 });
VisitSchema.index({ clientId: 1, startUtc: 1 });
// Compound indexes to support efficient overlap queries
VisitSchema.index({ propertyId: 1, startUtc: 1, endUtc: 1 });
VisitSchema.index({ agentId: 1, startUtc: 1 });
