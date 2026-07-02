# ============================
# Development stage
# ============================
FROM node:24.12.0-alpine3.23 AS development

# Create app user
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

# Install dependencies as root
COPY package*.json ./

RUN npm ci

# Copy source code
COPY . .

# Change ownership
RUN chown -R app:app /app

# Switch to non-root user
USER app

EXPOSE 3000

# For development
CMD ["npm", "run", "start:dev"]


# ============================
# Build stage
# ============================
FROM node:24.12.0-alpine3.23 AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


# ============================
# Production stage
# ============================
FROM node:24.12.0-alpine3.23 AS production

WORKDIR /app


RUN addgroup -S app && adduser -S -G app app


COPY package*.json ./


RUN npm ci --omit=dev


COPY --from=builder /app/dist ./dist


RUN chown -R app:app /app


USER app


EXPOSE 3000


CMD ["node", "dist/main.js"]