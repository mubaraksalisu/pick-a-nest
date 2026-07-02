import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  TestAppContext,
  clearDatabase,
  closeTestApp,
  createTestApp,
} from './utils/test-app';
import { SeededUser, seedCategory, seedUserAndLogin } from './utils/seed';

describe('Property review workflow + cache correctness (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication<App>;
  let server: App;

  let agent: SeededUser;
  let admin: SeededUser;
  let categoryId: string;
  let propertyId: string;

  const buildPropertyPayload = (overrides: Record<string, any> = {}) => ({
    title: 'Cache Test Listing',
    description: 'A listing used to exercise the review/cache workflow.',
    address: '1 Cache Street',
    city: 'Lagos',
    state: 'Lagos',
    price: 300000,
    transactionType: 'rent',
    rentDuration: 'monthly',
    status: 'available',
    bedroom: 3,
    bathroom: 2,
    livingRoom: 1,
    parkingSpace: 1,
    pool: 0,
    ownerId: '000000000000000000000000',
    categoryId,
    propertySize: '150sqm',
    media: ['properties/test-image.jpg'],
    ...overrides,
  });

  const listedIds = async (): Promise<string[]> => {
    const response = await request(server).get('/properties').expect(200);
    return response.body.data.map((property: any) => property._id);
  };

  beforeAll(async () => {
    context = await createTestApp();
    app = context.app;
    server = app.getHttpServer();
    await clearDatabase(context.connection);

    agent = await seedUserAndLogin(context, {
      email: 'review-agent@example.com',
      role: 'agent',
    });
    admin = await seedUserAndLogin(context, {
      email: 'review-admin@example.com',
      role: 'admin',
    });
    categoryId = await seedCategory(context, { name: 'Review Category' });
  });

  afterAll(async () => {
    await clearDatabase(context.connection);
    await closeTestApp(context);
  });

  it('creates a property as pending, hidden from the public list and detail view', async () => {
    const created = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send(buildPropertyPayload({ title: 'Pending Listing' }))
      .expect(201);

    expect(created.body.reviewStatus).toBe('pending');
    propertyId = created.body._id;

    expect(await listedIds()).not.toContain(propertyId);

    await request(server).get(`/properties/${propertyId}`).expect(404);
  });

  it('makes the property visible after admin approval, invalidating the cached list', async () => {
    // Prime the list cache with the pending-property state before approving,
    // so this actually proves the version bump invalidates it rather than
    // just happening to reflect a cold cache.
    expect(await listedIds()).not.toContain(propertyId);

    await request(server)
      .patch(`/properties/${propertyId}/approve`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(await listedIds()).toContain(propertyId);

    const detail = await request(server)
      .get(`/properties/${propertyId}`)
      .expect(200);
    expect(detail.body._id).toBe(propertyId);
    expect(detail.body.reviewStatus).toBe('approved');
  });

  it('hides the property again once an edit resets it to pending, invalidating both caches', async () => {
    // Prime both the list cache and the single-property cache with the
    // approved state before editing.
    expect(await listedIds()).toContain(propertyId);
    await request(server).get(`/properties/${propertyId}`).expect(200);

    const updated = await request(server)
      .patch(`/properties/${propertyId}`)
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send({ title: 'Edited Listing Title' })
      .expect(200);
    expect(updated.body.reviewStatus).toBe('pending');

    expect(await listedIds()).not.toContain(propertyId);
    await request(server).get(`/properties/${propertyId}`).expect(404);
  });

  it('re-approving makes the edited property visible again with the new title', async () => {
    await request(server)
      .patch(`/properties/${propertyId}/approve`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(await listedIds()).toContain(propertyId);

    const detail = await request(server)
      .get(`/properties/${propertyId}`)
      .expect(200);
    expect(detail.body.title).toBe('Edited Listing Title');
  });

  it('keeps a rejected property out of the public list', async () => {
    const created = await request(server)
      .post('/properties')
      .set('Authorization', `Bearer ${agent.accessToken}`)
      .send(buildPropertyPayload({ title: 'Rejected Listing' }))
      .expect(201);
    const rejectedId = created.body._id;

    await request(server)
      .patch(`/properties/${rejectedId}/reject`)
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .expect(200);

    expect(await listedIds()).not.toContain(rejectedId);
    await request(server).get(`/properties/${rejectedId}`).expect(404);
  });
});
