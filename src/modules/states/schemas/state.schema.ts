import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class State extends Document {
  @Prop({
    type: String,
    required: true,
    minlength: 3,
    maxlength: 50,
    unique: true,
    trim: true,
  })
  name: string;

  @Prop({
    type: [String],
    required: true,
    validate: {
      validator: function (value: string[]) {
        return (
          value &&
          value.length > 0 &&
          value.every((lga) => lga.length > 2 && lga.length <= 50)
        );
      },
      message:
        'State should have some L.G.A and each should have from 3 to 50 characters',
    },
  })
  localGovernmentAreas: string[];
}

export const StateSchema = SchemaFactory.createForClass(State);
