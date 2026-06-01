import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailVerification } from './email-verification.schema';

Injectable();
export class EmailVerificationService {
  constructor(
    @InjectModel(EmailVerification.name)
    private emailVerificationModel: Model<EmailVerification>,
  ) {}

  async create(userId: string, hashedToken: string, expireAt: Date) {
    const emailVerification = new this.emailVerificationModel({
      userId,
      hashedToken,
      expireAt,
    });
    return await emailVerification.save();
  }

  async validateToken(hashedToken: string) {
    const record = await this.emailVerificationModel.findOne({
      hashedToken,
    });

    if (!record || record.expireAt < new Date()) {
      return null;
    }

    return record;
  }

  async deleteToken(id: string) {
    await this.emailVerificationModel.findByIdAndDelete(id);
  }
}
