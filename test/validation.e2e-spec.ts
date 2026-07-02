import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import * as luxon from 'luxon';
import {
  TestAppContext,
  clearDatabase,
  closeTestApp,
  createTestApp,
} from './utils/test-app';
import { SeededUser, seedCategory, seedUserAndLogin } from './utils/seed';

describe('DTO validation pipe (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication<App>;
  let server: App;
  let agent: SeededUser;
  let categoryId: string;

  const futureDate = (daysFromNow = 2) =>
    luxon.DateTime.utc().plus({ days: daysFromNow }).toFormat('yyyy-MM-dd');

  beforeAll(async () => {
    context = await createTestApp();
    app = context.app;
    server = app.getHttpServer();
    await clearDatabase(context.connection);

    agent = await seedUserAndLogin(context, {
      email: 'agent@example.com',
      role: 'agent',
    });
    categoryId = await seedCategory(context, { name: 'Apartments' });
  });

  afterAll(async () => {
    await clearDatabase(context.connection);
    await closeTestApp(context);
  });

  describe('whitelist / forbidNonWhitelisted', () => {
    it('rejects an unknown field on register, closing off a role self-escalation attempt', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          firstName: 'Eve',
          lastName: 'Hacker',
          email: 'eve@example.com',
          password: 'correct-horse',
          phone: '08011112222',
          // CreateUserDto has no `role` field -- registration always
          // creates a plain 'user'. This confirms the global pipe rejects
          // (rather than silently drops) an attempt to smuggle one in.
          role: 'admin',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('role')]),
      );
    });
  });

  describe('required fields', () => {
    it('rejects registration missing a required field with a descriptive message', async () => {
      const response = await request(server)
        .post('/auth/register')
        .send({
          firstName: 'Missing',
          lastName: 'Password',
          email: 'missing-password@example.com',
          phone: '08011112222',
          // password intentionally omitted
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('password')]),
      );
    });
  });

  describe('type coercion / IsNumber', () => {
    it('rejects a non-numeric price on property creation', async () => {
      const response = await request(server)
        .post('/properties')
        .set('Authorization', `Bearer ${agent.accessToken}`)
        .send({
          title: 'Broken Price Listing',
          description: 'A listing with an invalid price value.',
          address: '1 Test Street',
          city: 'Lagos',
          state: 'Lagos',
          price: 'free', // not coercible to a number
          transactionType: 'rent',
          rentDuration: 'monthly',
          status: 'available',
          bedroom: 2,
          bathroom: 2,
          livingRoom: 1,
          parkingSpace: 1,
          pool: 0,
          ownerId: '000000000000000000000000',
          categoryId,
          propertySize: '100sqm',
          media: ['properties/test-image.jpg'],
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('price')]),
      );
    });
  });

  describe('pattern validation', () => {
    it('rejects a malformed startTime on visit creation', async () => {
      const response = await request(server)
        .post('/visits')
        .set('Authorization', `Bearer ${agent.accessToken}`)
        .send({
          propertyId: '000000000000000000000001',
          agentId: '000000000000000000000002',
          visitDate: futureDate(),
          startTime: '25:99',
          endTime: '11:00',
        })
        .expect(400);

      expect(response.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('startTime')]),
      );
    });
  });
});
