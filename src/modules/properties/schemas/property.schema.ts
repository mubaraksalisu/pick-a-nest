import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Property extends Document {
  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  })
  title: string;

  @Prop({
    type: String,
    required: true,
    minlength: 5,
    maxlength: 255,
    trim: true,
  })
  description: string;

  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  })
  address: string;

  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  })
  city: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  })
  state: string;

  @Prop({
    type: Number,
    required: true,
    min: 0,
  })
  price: number;

  @Prop({
    type: String,
    required: true,
    enum: ['rent', 'sell'],
  })
  transactionType: string;

  @Prop({
    type: Number,
    min: 1,
  })
  bedroom: number;

  @Prop({
    type: Number,
    min: 1,
  })
  bathroom: number;

  @Prop({
    type: Number,
    min: 0,
  })
  livingRoom: number;

  @Prop({
    type: Number,
    min: 0,
  })
  parkingSpace: number;

  @Prop({
    type: Number,
    min: 0,
  })
  pool: number;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  ownerId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Category',
    required: true,
  })
  categoryId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['available', 'sold', 'rented'],
    default: 'available',
  })
  status: string;

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 2048,
  })
  virtualTourLink: string;

  @Prop({
    type: [String],
    validate: {
      validator: function (value: any) {
        return (
          value &&
          value.length > 0 &&
          value.every((url: string) => url.length > 4 && url.length <= 2048)
        );
      },
      message:
        'property should have at least one media url and the url should be valid',
    },
    required: true,
  })
  media: string[];

  @Prop({
    required: function () {
      return this.transactionType === 'rent';
    },
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  rentDuration: string;

  @Prop({
    type: String,
    required: true,
    maxlength: 20,
    trim: true,
  })
  propertySize: string;
}

export const PropertySchema = SchemaFactory.createForClass(Property);

PropertySchema.index({ city: 1 });
PropertySchema.index({ state: 1 });
PropertySchema.index({ type: 1 });
PropertySchema.index({ price: 1 });
PropertySchema.index({ bedroom: 1 });
PropertySchema.index({ bathroom: 1 });
PropertySchema.index({ createdAt: -1 });

PropertySchema.index({
  title: 'text',
  description: 'text',
  address: 'text',
});
