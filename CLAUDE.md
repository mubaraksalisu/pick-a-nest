# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

To develop and test this NestJS application:
- **Build**: `npm run build` (Compiles the application)
- **Lint**: `npm run lint` (Runs ESLint checks using `eslint.config.mjs`)
- **Test**: `npm test` (Runs Jest tests in `src/modules/**/spec.ts` files)
- **Run locally**: `npm start` (Starts the development server)

## Code Architecture Overview

This NestJS application follows a modular structure with clear separation of concerns:

1. **Core Modules**:
   - `auth`: Handles authentication (JWT/local strategies, guards)
   - `categories`: Manages category data (services, DTOs, schemas)
   - `properties`: Core property management (CRUD operations, schemas)
   - `agent-reviews`: Manages agent review data (DTOs, services)
   - `states` and `visits`: Track state and visit information

2. **Shared Components**:
   - `shared/guards`: Reusable guards (admin, object ID validation)
   - `shared/filters`: Centralized error handling
   - `shared/utils`: Utility functions (e.g., `isValidObjectId`)

3. **Data Layer**:
   - TypeORM-based (implied by DTOs/schemas)
   - Modular services for each functionality

4. **API Gateway**:
   - `home.controller` and other controllers handle incoming requests
   - `main.ts` is the entry point that boots the Nest application

## Key Features

- JWT-based authentication with refresh tokens
- RESTful API structure for property management
- Review system for agents and properties
- Modular design allowing easy extension of features

## Development Notes

- Use `tsconfig.json` for TypeScript configuration
- ESLint configuration in `eslint.config.mjs` enforces code style
- All database interactions go through module-specific services
- DTOs and schemas are generated for TypeORM compatibility