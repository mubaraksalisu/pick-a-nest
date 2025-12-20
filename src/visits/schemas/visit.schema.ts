import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Visit extends Document {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  ownerId: Types.ObjectId;

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
  visitDate: Date;

  @Prop({
    type: String,
    enum: ['requesting', 'completed', 'canceled', 'scheduled'],
    default: 'requesting',
  })
  status: string;
}

export const VisitSchema = SchemaFactory.createForClass(Visit);
