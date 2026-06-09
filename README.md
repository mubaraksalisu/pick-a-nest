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

- The container currently runs the development command `npm run start:dev` by default. See [Dockerfile](Dockerfile) to adjust for production.

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

Run unit tests:

```bash
npm run test
```

Run e2e tests:

```bash
npm run test:e2e
```

Generate coverage:

```bash
npm run test:cov
```

## Code quality

Format and lint:

```bash
npm run format
npm run lint
```

## Project layout

Top-level source folders:

- `src/modules` — feature modules (auth, users, properties, categories, states, favorites, visits, reviews, etc.)
- `src/infrastructure` — platform integrations (AWS S3, cache, mail, queues)
- `src/shared` — guards, filters, and utilities
- `test` — e2e test suites

## Contributing

If you'd like to contribute, please open an issue or a pull request. Include a short description of the change and relevant tests.

## License

This repository is currently marked as `UNLICENSED` in [package.json](package.json). If you want to add a license, update `package.json` and add a `LICENSE` file.

---

If you'd like, I can also:

- Add a `.env.example` file based on the variables above
- Add a short `CONTRIBUTING.md` with local development steps
- Update the `Dockerfile` to include a production image target

Tell me which of those you'd like next.
