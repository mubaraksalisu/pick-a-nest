import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  TestAppContext,
  clearDatabase,
  closeTestApp,
  createTestApp,
} from './utils/test-app';
import { EMAIL_JOBS } from 'src/infrastructure/queues/queue.constants';

describe('Auth (e2e)', () => {
  let context: TestAppContext;
  let app: INestApplication<App>;
  let server: App;

  const registerDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada.lovelace@example.com',
    password: 'correct-horse',
    phone: '08012345678',
  };

  let rawVerificationToken: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    context = await createTestApp();
    app = context.app;
    server = app.getHttpServer();
    await clearDatabase(context.connection);
  });

  afterAll(async () => {
    await clearDatabase(context.connection);
    await closeTestApp(context);
  });

  it('registers a new user without leaking the password and queues a verification email', async () => {
    const response = await request(server)
      .post('/auth/register')
      .send(registerDto)
      .expect(201);

    expect(response.body).not.toHaveProperty('password');
    expect(response.body.email).toBe(registerDto.email);
    expect(response.body.status).toBe('deactivated');

    const verificationCall =
      context.queuesServiceMock.queueEmail.mock.calls.find(
        (call) => call[0] === EMAIL_JOBS.EMAIL_VERIFICATION,
      );
    expect(verificationCall).toBeDefined();
    expect(verificationCall[1].email).toBe(registerDto.email);
    rawVerificationToken = verificationCall[1].token;
    expect(typeof rawVerificationToken).toBe('string');
  });

  it('rejects login before the email is verified', async () => {
    const response = await request(server)
      .post('/auth/login')
      .send({ email: registerDto.email, password: registerDto.password })
      .expect(401);

    expect(response.body.message).toContain('inactive');
  });

  it('rejects an invalid verification token', async () => {
    await request(server)
      .get('/auth/verify-email')
      .query({ token: 'not-the-real-token' })
      .expect(401);
  });

  it('verifies the email with the token from the queued job', async () => {
    await request(server)
      .get('/auth/verify-email')
      .query({ token: rawVerificationToken })
      .expect(200);
  });

  it('rejects reusing an already-consumed verification token', async () => {
    await request(server)
      .get('/auth/verify-email')
      .query({ token: rawVerificationToken })
      .expect(401);
  });

  it('logs in successfully once the email is verified', async () => {
    const response = await request(server)
      .post('/auth/login')
      .send({ email: registerDto.email, password: registerDto.password })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;
  });

  it('rejects login with the wrong password', async () => {
    await request(server)
      .post('/auth/login')
      .send({ email: registerDto.email, password: 'wrong-password' })
      .expect(401);
  });

  it('returns the authenticated profile for a valid access token', async () => {
    const response = await request(server)
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body.email).toBe(registerDto.email);
    expect(response.body).not.toHaveProperty('password');
  });

  it('rejects /auth/me with no token', async () => {
    await request(server).get('/auth/me').expect(401);
  });

  it('rejects /auth/me with a malformed token', async () => {
    await request(server)
      .get('/auth/me')
      .set('Authorization', 'Bearer not-a-real-token')
      .expect(401);
  });

  it('issues a new token pair on refresh and revokes the old refresh token record', async () => {
    const usedRefreshToken = refreshToken;

    const beforeDocs = await context.connection
      .collection('refreshtokens')
      .find({})
      .toArray();
    expect(beforeDocs.filter((d) => !d.revoked)).toHaveLength(1);

    const response = await request(server)
      .post('/auth/refresh')
      .send({ refreshToken: usedRefreshToken })
      .expect(201);

    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));

    accessToken = response.body.accessToken;
    refreshToken = response.body.refreshToken;

    // Verified at the DB level rather than by re-POSTing the old token
    // string: JWTs are deterministic given identical claims + the same iat
    // second, so a same-second rotation can legitimately produce a
    // byte-identical "new" token, which would make an HTTP reuse-check
    // indistinguishable from just using the current valid token again.
    const afterDocs = await context.connection
      .collection('refreshtokens')
      .find({})
      .toArray();
    expect(afterDocs).toHaveLength(2);
    expect(afterDocs.filter((d) => d.revoked)).toHaveLength(1);
    expect(afterDocs.filter((d) => !d.revoked)).toHaveLength(1);
  });

  it('revokes the refresh token on logout so it can no longer be used', async () => {
    await request(server)
      .post('/auth/logout')
      .send({ refreshToken })
      .expect(201);

    await request(server)
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });
});
