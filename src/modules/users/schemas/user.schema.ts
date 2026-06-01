import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  })
  firstName: string;

  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    trim: true,
  })
  lastName: string;

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 255,
    required: true,
    unique: true,
    trim: true,
  })
  email: string;

  @Prop({
    type: String,
    required: true,
    minlength: 5,
    maxlength: 1024,
  })
  password: string;

  @Prop({
    type: String,
    enum: ['admin', 'user', 'agent'],
    default: 'user',
  })
  role: 'admin' | 'user' | 'agent';

  @Prop({
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  })
  agentReviewStatus: 'none' | 'pending' | 'approved' | 'rejected';

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 20,
    required: true,
  })
  phone: string;

  @Prop({
    type: String,
    enum: ['active', 'suspended', 'deactivated'],
    default: 'deactivated',
  })
  status: 'active' | 'suspended' | 'deactivated';

  @Prop({
    type: String,
    minlength: 5,
    maxlength: 2048,
  })
  imageUrl: string;

  @Prop({
    type: Boolean,
    default: false,
  })
  emailVerified: boolean;

  @Prop({
    type: Date,
  })
  emailVerifiedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
