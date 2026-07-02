import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

@Schema({ timestamps: true })
export class RefreshToken extends Document {
  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    required: true,
    trim: true,
  })
  hashedToken: string;

  @Prop({
    type: Date,
    required: true,
  })
  expireAt: Date;

  @Prop({
    type: Boolean,
    default: false,
  })
  revoked: boolean = false;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
