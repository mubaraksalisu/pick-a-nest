import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Category extends Document {
  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
    unique: true,
  })
  name: string;

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 255,
  })
  description: string;

  @Prop({
    type: String,
    required: true,
    trim: true,
    minlength: 3,
    maxlength: 50,
  })
  icon: string;
}

export const CategorySchema = SchemaFactory.createForClass(Category);
