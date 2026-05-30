import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersModule } from 'src/modules/users/users.module';
import {
  EmailVerification,
  EmailVerificationSchema,
} from './email-verification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: EmailVerification.name, schema: EmailVerificationSchema },
    ]),
    UsersModule,
  ],
})
export class EmailVerificationModule {}
