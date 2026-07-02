# Pick-a-Nest

A NestJS-based real estate backend API implemented in TypeScript. This repository provides a modular server with authentication, property management, caching, background jobs, health checks, and API documentation.

**Quick links**

- **API docs:** http://localhost:3000/docs
- **Compose:** `compose.yaml` for local development

**Status:** Prototype / development

## Features

- Modular NestJS architecture
- MongoDB persistence via Mongoose
- Redis-backed caching
- JWT access + refresh tokens
- Passport strategies (local + jwt)
- Swagger documentation at `/docs`
- Global validation and exception handling
- Rate limiting via `@nestjs/throttler`
- Structured logging with `winston`
- Jest + Supertest test setup

## Quick start

Prerequisites: Node.js 24+, npm, MongoDB, Redis (or Docker).

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file (copy `.env.example` if present) and set values. Example:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/pick-a-nest-db
DATABASE_NAME=pick-a-nest-db
REDIS_URL=redis://localhost:6379
SECRET=change_this_secret
REFRESH_EXPIRES_IN=30d
ACCESS_EXPIRES_IN=45m
```

3. Run the app (development)

```bash
npm run start:dev
```

Production build and run:

```bash
npm run build
npm run start:prod
```

Available scripts are defined in [package.json](package.json).

## Docker (local development)

Start services with Docker Compose:

```bash
docker compose up --build
```

The `compose.yaml` defines three services: `server`, `db` (MongoDB), and `redis`.

Notes about the `Dockerfile`:

- It's a multi-stage build with three targets: `development` (runs `npm run start:dev` with the source mounted, used by `compose.yaml`), `builder` (compiles the app), and `production` (installs only production dependencies and runs the compiled output via `node dist/main.js`).
- Build the production image directly with `docker build --target production -t pick-a-nest .`

## Configuration

The app reads configuration from environment variables. Important variables:

- `NODE_ENV` — environment mode (`development`, `production`, `test`)
- `PORT` — HTTP server port (default `3000`)
- `DATABASE_URL` — MongoDB connection string
- `DATABASE_NAME` — MongoDB database name
- `REDIS_URL` — Redis connection string
- `SECRET` — JWT signing secret
- `REFRESH_EXPIRES_IN` — refresh token TTL
- `ACCESS_EXPIRES_IN` — access token TTL

## API documentation

Swagger UI is available at `/docs` when the server is running. Open:

```
http://localhost:3000/docs
```

## Testing

### Unit tests

```bash
npm run test
```

Every service (`*.service.ts`) has 100% statement/branch/function/line coverage. Unit tests fully mock the Mongoose model and external services, so they don't need MongoDB, Redis, or any real network access.

Generate a coverage report:

```bash
npm run test:cov
```

### E2E tests

```bash
npm run test:e2e
```

E2E tests boot the real `AppModule` and need a reachable MongoDB and Redis matching the credentials in `.env.test` (see `.env.example` for the variable names). `QueuesService` is mocked in the shared test harness (`test/utils/test-app.ts`) so no real emails are sent.

Suites in `test/`:

- `app.e2e-spec.ts` — basic app bootstrap smoke test
- `auth.e2e-spec.ts` — full register → verify-email → login → refresh → logout lifecycle
- `authorization.e2e-spec.ts` — role guards, ownership checks, and the visit/property access guards
- `visits-booking.e2e-spec.ts` — visit creation, scheduling-conflict detection, confirm/reschedule/cancel
- `validation.e2e-spec.ts` — global `ValidationPipe` behavior (whitelisting, type coercion, pattern validation)
- `properties-review.e2e-spec.ts` — the property review workflow and cache invalidation on approve/reject/edit

Because these tests share one live database, `test/jest-e2e.json` sets `maxWorkers: 1` so suites run serially rather than racing each other over the same collections. Shared fixtures/setup helpers live in `test/utils/`.

## Code quality

Format and lint:

```bash
npm run format
npm run lint
```

## Project layout

Top-level source folders:

- `src/modules` — feature modules (`auth`, `users`, `properties`, `categories`, `states`, `favorites`, `visits`, `home`, `health`); property review/approval lives inside the `properties` module rather than a separate module
- `src/infrastructure` — platform integrations (AWS S3, cache, mail, queues)
- `src/shared` — guards, filters, and utilities
- `test` — e2e test suites and shared test utilities (`test/utils`)

## Contributing

If you'd like to contribute, please open an issue or a pull request. Include a short description of the change and relevant tests.

## License

This repository is currently marked as `UNLICENSED` in [package.json](package.json). If you want to add a license, update `package.json` and add a `LICENSE` file.
