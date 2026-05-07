FROM node:24.12.0-alpine3.23

# Create app user
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app

# Install dependencies as root
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Change ownership
RUN chown -R app:app /app

# Switch to non-root user
USER app

EXPOSE 3000

# For development
CMD ["npm", "run", "start:dev"]