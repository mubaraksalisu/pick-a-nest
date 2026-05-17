# Pick-a-Nest

A NestJS-based real estate backend API built with TypeScript, MongoDB, Redis, JWT authentication, Swagger docs, and structured logging.

## Overview

`pick-a-nest` is designed as a complete backend for a property marketplace. It includes support for users, auth, properties, states, categories, favorites, visits, reviews, caching, rate limiting, health checks, and API documentation.

## Key features

- Modular NestJS architecture
- MongoDB persistence via Mongoose
- Redis-backed caching for fast responses
- JWT authentication with access and refresh tokens
- Passport local + JWT strategies
- API documentation at `/docs`
- Global validation and exception handling
- Rate limiting using `@nestjs/throttler`
- Production-grade logging with `winston`
- Health checks via `@nestjs/terminus`
- Jest + Supertest test setup

## Project structure

Top-level modules include:

- `src/modules/auth` — authentication, login, and token handling
- `src/modules/users` — user registration and management
- `src/modules/properties` — property CRUD and listing
- `src/modules/categories` — property categories
- `src/modules/states` — geographic state management
- `src/modules/favorites` — favorite listings for users
- `src/modules/visits` — visit scheduling or tracking
- `src/modules/property-reviews` — reviews for properties
- `src/modules/agent-reviews` — reviews for agents
- `src/modules/refresh-token` — refresh token persistence
- `src/modules/health` — readiness and liveness checks
- `src/shared` — global filters, guards, and utilities

## Tech stack

- Node.js 24
- NestJS 11
- TypeScript
- MongoDB via Mongoose
- Redis cache via `@keyv/redis`
- Swagger UI (`@nestjs/swagger`)
- JWT auth with `passport-jwt`
- Winston logging
- Jest + Supertest for tests
- ESLint + Prettier for formatting and linting

## Prerequisites

- Node.js 24+ and npm
- MongoDB
- Redis
- Docker and Docker Compose (optional)

## Setup

1. Install dependencies

```bash
npm install
```

2. Create a `.env` file in the project root

Example `.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=mongodb://localhost:27017/pick-a-nest-db
DATABASE_NAME=pick-a-nest-db
REDIS_URL=redis://localhost:6379
SECRET=your_jwt_secret_here
REFRESH_EXPIRES_IN=30d
ACCESS_EXPIRES_IN=45m
```

> Tests run with `NODE_ENV=test` and load `.env.test` when present.

## Running the app

```bash
npm run start
```

For hot reload during development:

```bash
npm run start:dev
```

Production build and run:

```bash
npm run build
npm run start:prod
```

The app listens on the port defined by `PORT` or `3000` by default.

## Docker

Build and run the container locally:

```bash
docker compose up --build
```

This starts:

- `server` on port `3000`
- `db` MongoDB service on port `27017`
- `redis` on port `6379`

The current `Dockerfile` is configured to run the app in development mode with `npm run start:dev`. If you need a production container, adjust the Dockerfile CMD or run `npm run start:prod` inside the image.

## API documentation

Open the Swagger UI at:

```text
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

Format source files:

```bash
npm run format
```

Run linting and auto-fix issues:

```bash
npm run lint
```

## Environment variables

The app reads configuration from `.env` by default. Important variables:

- `NODE_ENV` — environment mode
- `PORT` — HTTP server port
- `DATABASE_URL` — MongoDB connection string
- `DATABASE_NAME` — MongoDB database name
- `REDIS_URL` — Redis connection string
- `SECRET` — JWT secret key
- `REFRESH_EXPIRES_IN` — refresh token TTL
- `ACCESS_EXPIRES_IN` — access token TTL

## Notes

- Global validation is enforced via `ValidationPipe`.
- Swagger docs are registered under `/docs`.
- Winston logs errors to `logs/error.log` and console output.
- Redis caching is configured via `REDIS_URL`, with `redis://localhost:6379` as the local default.

## License

This repository is currently marked as `UNLICENSED` in `package.json`.
