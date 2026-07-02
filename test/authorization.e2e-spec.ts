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

describe('Authorization (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication<App>;
  let server: App;

  let admin: SeededUser;
  let agentOwner: SeededUser;
  let agentOther: SeededUser;
  let customer: SeededUser;
  let outsider: SeededUser;

  let categoryId: string;
  let approvedPropertyId: string;
  let visitId: string;

  const futureDate = (daysFromNow = 2) =>
    luxon.DateTime.utc().plus({ days: daysFromNow }).toFormat('yyyy-MM-dd');

  const buildPropertyPayload = (overrides: Record<string, any> = {}) => ({
    title: 'Sunny Two Bedroom Flat',
    description: 'A lovely, sunny two bedroom apartment near the city.',
    address: '12 Independence Way',
    city: 'Lagos',
    state: 'Lagos',
    price: 250000,
    transactionType: 'rent',
    // The DTO marks this optional, but PropertySchema conditionally
    // requires it when transactionType is 'rent' -- omitting it throws an
    // unhandled 500 from Mongoose's own validation instead of a clean 400.
    rentDuration: 'monthly',
    status: 'available',
    bedroom: 2,
    bathroom: 2,
    livingRoom: 1,
    parkingSpace: 1,
    pool: 0,
    // Overridden server-side with the authenticated user's id, but the DTO
    // still requires a syntactically valid ObjectId to pass validation.
    ownerId: '000000000000000000000000',
    categoryId,
    propertySize: '120sqm',
    media: ['properties/test-image.jpg'],
    ...overrides,
  });

  beforeAll(async () => {
    context = await createTestApp();
    app = context.app;
    server = app.getHttpServer();
    await clearDatabase(context.connection);

    admin = await seedUserAndLogin(context, {
      email: 'admin@example.com',
      role: 'admin',
    });
    agentOwner = await seedUserAndLogin(context, {
      email: 'agent-owner@example.com',
      role: 'agent',
    });
    agentOther = await seedUserAndLogin(context, {
      email: 'agent-other@example.com',
      role: 'agent',
    });
    customer = await seedUserAndLogin(context, {
      email: 'customer@example.com',
      role: 'user',
    });
    outsider = await seedUserAndLogin(context, {
      email: 'outsider@example.com',
      role: 'user',
    });

    categoryId = await seedCategory(context, { name: 'Apartments' });

    const createResponse = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${agentOwner.accessToken}`)
      .send(buildPropertyPayload())
      .expect(201);
    approvedPropertyId = createResponse.body._id;

    await request(server)
      .patch(`/properties/${approvedPropertyId}/approve`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    const createVisitResponse = await request(server)
      .post('/visits')
      .set('Authorization', `Bearer ${customer.accessToken}`)
      .send({
        propertyId: approvedPropertyId,
        agentId: agentOwner.id,
        customerId: customer.id,
        visitDate: futureDate(),
        startTime: '10:00',
        endTime: '11:00',
      })
      .expect(201);
    visitId = createVisitResponse.body._id;
  });

  afterAll(async () => {
    await clearDatabase(context.connection);
    await closeTestApp(context);
  });

  describe('missing authentication', () => {
    it('rejects guarded routes with no Authorization header', async () => {
      await request(server).post('/properties').send({}).expect(401);
      await request(server).get('/visits/my-visits').expect(401);
      await request(server).get('/users').expect(401);
    });
  });

  describe('role guard (AGENT-only routes)', () => {
    it('rejects a regular user creating a property', async () => {
      await request(server)
        .post('/properties')
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send(buildPropertyPayload())
        .expect(403);
    });

    it('rejects a regular user requesting a presigned upload url', async () => {
      await request(server)
        .post('/properties/upload-url')
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({ fileName: 'photo.jpg', fileType: 'image/jpeg' })
        .expect(403);
    });

    it('allows an agent to create a property', async () => {
      await request(server)
        .post('/properties')
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .send(buildPropertyPayload({ title: 'Another Listing' }))
        .expect(201);
    });
  });

  describe('role guard (ADMIN-only routes)', () => {
    it('rejects an agent listing pending properties', async () => {
      await request(server)
        .get('/properties/pending')
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .expect(403);
    });

    it('allows an admin to list pending properties', async () => {
      await request(server)
        .get('/properties/pending')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    });

    it('rejects an agent approving a property', async () => {
      const pending = await request(server)
        .post('/properties')
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .send(buildPropertyPayload({ title: 'Pending Listing' }))
        .expect(201);

      await request(server)
        .patch(`/properties/${pending.body._id}/approve`)
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .expect(403);
    });

    it('rejects a non-admin listing all users', async () => {
      await request(server)
        .get('/users')
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .expect(403);
    });

    it('allows an admin to list all users', async () => {
      await request(server)
        .get('/users')
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    });
  });

  describe('ownership check (not a role guard, but enforced end-to-end)', () => {
    // Uses its own property rather than approvedPropertyId: updating a
    // property flips its reviewStatus back to 'pending', which would break
    // later tests that rely on approvedPropertyId staying approved.
    let ownershipTestPropertyId: string;

    beforeAll(async () => {
      const created = await request(server)
        .post('/properties')
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .send(buildPropertyPayload({ title: 'Ownership Test Listing' }))
        .expect(201);
      ownershipTestPropertyId = created.body._id;
      await request(server)
        .patch(`/properties/${ownershipTestPropertyId}/approve`)
        .set('Authorization', `Bearer ${admin.accessToken}`)
        .expect(200);
    });

    it('rejects an agent updating a property they do not own', async () => {
      await request(server)
        .patch(`/properties/${ownershipTestPropertyId}`)
        .set('Authorization', `Bearer ${agentOther.accessToken}`)
        .send({ title: 'Hijacked Title' })
        .expect(403);
    });

    it('allows the owning agent to update their own property', async () => {
      await request(server)
        .patch(`/properties/${ownershipTestPropertyId}`)
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .send({ title: 'Updated By Owner' })
        .expect(200);
    });
  });

  describe('CanAccessVisitGuard', () => {
    it('rejects a user who is neither the agent, customer, nor property owner', async () => {
      await request(server)
        .patch(`/visits/${visitId}/confirm`)
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .expect(403);
    });

    it('allows the visit customer to act on the visit', async () => {
      await request(server)
        .patch(`/visits/${visitId}/confirm`)
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(200);
    });
  });

  describe('CanAccessPropertyGuard', () => {
    it('rejects a non-owner agent listing visits for a property', async () => {
      await request(server)
        .get(`/visits/property/${approvedPropertyId}`)
        .set('Authorization', `Bearer ${agentOther.accessToken}`)
        .expect(403);
    });

    it('allows the owning agent to list visits for their property', async () => {
      await request(server)
        .get(`/properties/${approvedPropertyId}/visits`)
        .set('Authorization', `Bearer ${agentOwner.accessToken}`)
        .expect(200);
    });
  });

  describe('ObjectIdGuard', () => {
    it('rejects a malformed id on a property route', async () => {
      await request(server).get('/properties/not-an-id').expect(400);
    });

    it('rejects a malformed id on a visit route', async () => {
      await request(server)
        .patch('/visits/not-an-id/confirm')
        .set('Authorization', `Bearer ${customer.accessToken}`)
        .expect(400);
    });
  });

  describe('POST /visits authorization (documented current behavior)', () => {
    it('allows any authenticated user to create a visit naming other people as agent/customer', async () => {
      // POST /visits only requires JwtAuthGuard -- unlike every other visit
      // mutation, there is no check that the caller is actually the named
      // agentId or customerId. This test documents that current behavior
      // rather than asserting it's correct; flagged separately as a gap.
      await request(server)
        .post('/visits')
        .set('Authorization', `Bearer ${outsider.accessToken}`)
        .send({
          propertyId: approvedPropertyId,
          agentId: agentOwner.id,
          customerId: customer.id,
          visitDate: futureDate(5),
          startTime: '09:00',
          endTime: '10:00',
        })
        .expect(201);
    });
  });
});
