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

describe('Visits booking (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication<App>;
  let server: App;

  let agentA: SeededUser;
  let agentB: SeededUser;
  let customer1: SeededUser;
  let customer2: SeededUser;
  let admin: SeededUser;

  let propertyOne: string;
  let propertyTwo: string;
  let propertyThree: string;

  const futureDate = (daysFromNow = 2) =>
    luxon.DateTime.utc().plus({ days: daysFromNow }).toFormat('yyyy-MM-dd');

  const createApprovedProperty = async (
    owner: SeededUser,
    categoryId: string,
    overrides: Record<string, any> = {},
  ) => {
    const created = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${owner.accessToken}`)
      .send({
        title: 'Test Listing',
        description: 'A lovely place to view for a scheduled visit.',
        address: '1 Test Street',
        city: 'Lagos',
        state: 'Lagos',
        price: 200000,
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
        ...overrides,
      })
      .expect(201);

    await request(server)
      .patch(`/properties/${created.body._id}/approve`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    return created.body._id as string;
  };

  // customerId is derived server-side from the authenticated caller (not
  // client-supplied), so the acting customer is passed explicitly here
  // rather than as a body field.
  const createVisit = (
    actingCustomer: SeededUser,
    payload: {
      propertyId: string;
      agentId: string;
      visitDate: string;
      startTime: string;
      endTime: string;
    },
  ) =>
    request(server)
      .post('/visits')
      .set('Authorization', `Bearer ${actingCustomer.accessToken}`)
      .send(payload);

  beforeAll(async () => {
    context = await createTestApp();
    app = context.app;
    server = app.getHttpServer();
    await clearDatabase(context.connection);

    admin = await seedUserAndLogin(context, {
      email: 'admin@example.com',
      role: 'admin',
    });
    agentA = await seedUserAndLogin(context, {
      email: 'agent-a@example.com',
      role: 'agent',
    });
    agentB = await seedUserAndLogin(context, {
      email: 'agent-b@example.com',
      role: 'agent',
    });
    customer1 = await seedUserAndLogin(context, {
      email: 'customer-1@example.com',
      role: 'user',
    });
    customer2 = await seedUserAndLogin(context, {
      email: 'customer-2@example.com',
      role: 'user',
    });

    const categoryId = await seedCategory(context, { name: 'Apartments' });

    propertyOne = await createApprovedProperty(agentA, categoryId, {
      title: 'Property One',
    });
    propertyTwo = await createApprovedProperty(agentA, categoryId, {
      title: 'Property Two',
    });
    propertyThree = await createApprovedProperty(agentB, categoryId, {
      title: 'Property Three',
    });
  });

  afterAll(async () => {
    await clearDatabase(context.connection);
    await closeTestApp(context);
  });

  describe('creating a visit', () => {
    it('creates a visit for a valid future window', async () => {
      const response = await createVisit(customer1, {
        propertyId: propertyOne,
        agentId: agentA.id,
        visitDate: futureDate(),
        startTime: '10:00',
        endTime: '11:00',
      }).expect(201);

      expect(response.body.status).toBe('pending');
      expect(response.body.customerId).toBe(customer1.id);
    });

    it('rejects an overlapping visit for the same property', async () => {
      await createVisit(customer2, {
        propertyId: propertyOne,
        agentId: agentB.id,
        visitDate: futureDate(),
        startTime: '10:30',
        endTime: '11:30',
      }).expect(409);
    });

    it('rejects an overlapping visit for the same agent on a different property', async () => {
      await createVisit(customer2, {
        propertyId: propertyTwo,
        agentId: agentA.id,
        visitDate: futureDate(),
        startTime: '10:30',
        endTime: '11:30',
      }).expect(409);
    });

    it('rejects an overlapping visit for the same customer on a different property/agent', async () => {
      await createVisit(customer1, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(),
        startTime: '10:30',
        endTime: '11:30',
      }).expect(409);
    });

    it('rejects a visit longer than 4 hours', async () => {
      await createVisit(customer2, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(),
        startTime: '08:00',
        endTime: '13:00',
      }).expect(400);
    });

    it('rejects a visit with a start date in the past', async () => {
      await createVisit(customer2, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(-2),
        startTime: '10:00',
        endTime: '11:00',
      }).expect(400);
    });
  });

  describe('confirming and rescheduling a visit', () => {
    let visitId: string;

    beforeAll(async () => {
      const created = await createVisit(customer2, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(10),
        startTime: '09:00',
        endTime: '10:00',
      }).expect(201);
      visitId = created.body._id;
    });

    it('confirms a pending visit', async () => {
      const response = await request(server)
        .patch(`/visits/${visitId}/confirm`)
        .set('Authorization', `Bearer ${customer2.accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('confirmed');
    });

    it('reschedules the visit to a non-conflicting window', async () => {
      const response = await request(server)
        .patch(`/visits/${visitId}/reschedule`)
        .set('Authorization', `Bearer ${customer2.accessToken}`)
        .send({
          visitDate: futureDate(11),
          startTime: '13:00',
          endTime: '14:00',
          note: 'moved to the afternoon',
        })
        .expect(200);

      expect(response.body.status).toBe('rescheduled');
    });

    it('rejects rescheduling into a window that now conflicts with another visit', async () => {
      await createVisit(customer1, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(12),
        startTime: '09:00',
        endTime: '10:00',
      }).expect(201);

      await request(server)
        .patch(`/visits/${visitId}/reschedule`)
        .set('Authorization', `Bearer ${customer2.accessToken}`)
        .send({
          visitDate: futureDate(12),
          startTime: '09:30',
          endTime: '10:30',
        })
        .expect(409);
    });
  });

  describe('cancelling a visit', () => {
    it('rejects cancelling a visit that is already completed', async () => {
      const created = await createVisit(customer1, {
        propertyId: propertyThree,
        agentId: agentB.id,
        visitDate: futureDate(20),
        startTime: '09:00',
        endTime: '10:00',
      }).expect(201);
      const visitId = created.body._id;

      await request(server)
        .patch(`/visits/${visitId}/confirm`)
        .set('Authorization', `Bearer ${customer1.accessToken}`)
        .expect(200);

      await request(server)
        .patch(`/visits/${visitId}/complete`)
        .set('Authorization', `Bearer ${customer1.accessToken}`)
        .expect(200);

      await request(server)
        .patch(`/visits/${visitId}/cancel`)
        .set('Authorization', `Bearer ${customer1.accessToken}`)
        .send({ reason: 'changed my mind' })
        .expect(400);
    });
  });
});
