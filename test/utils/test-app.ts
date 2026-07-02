import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { AppModule } from '../../src/app.module';
import { QueuesService } from 'src/infrastructure/queues/queues.service';

export interface QueuesServiceMock {
  queueEmail: jest.Mock;
}

export interface TestAppContext {
  app: INestApplication;
  moduleFixture: TestingModule;
  connection: Connection;
  queuesServiceMock: QueuesServiceMock;
}

/**
 * Boots the real AppModule against the Mongo/Redis instances configured in
 * .env.test, mirroring main.ts's global ValidationPipe. QueuesService is
 * replaced with a spy so email jobs never reach the real BullMQ
 * worker/Resend, and ThrottlerGuard is disabled so rate limiting doesn't
 * interfere with sequential e2e assertions.
 */
export async function createTestApp(): Promise<TestAppContext> {
  const queuesServiceMock: QueuesServiceMock = {
    queueEmail: jest.fn().mockResolvedValue({ jobId: 'mock-job-id' }),
  };

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(QueuesService)
    .useValue(queuesServiceMock)
    .overrideGuard(ThrottlerGuard)
    .useValue({ canActivate: () => true })
    .compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();

  const connection = app.get<Connection>(getConnectionToken());

  return { app, moduleFixture, connection, queuesServiceMock };
}

export async function clearDatabase(connection: Connection): Promise<void> {
  const collections = connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
}

export async function closeTestApp(context: TestAppContext): Promise<void> {
  await context.connection.close();
  await context.app.close();
}
