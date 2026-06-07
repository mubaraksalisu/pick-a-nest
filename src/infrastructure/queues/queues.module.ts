import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueuesService } from './queues.service';
import { QUEUES } from './queue.constants';
import { EmailProcessor } from './processors/email.processor';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'localhost'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },

          defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
          },
        };
      },
      inject: [ConfigService],
    }),

    BullModule.registerQueue({
      name: QUEUES.EMAIL,
    }),
    MailModule,
  ],

  providers: [QueuesService, EmailProcessor],

  exports: [QueuesService],
})
export class QueuesModule {}
