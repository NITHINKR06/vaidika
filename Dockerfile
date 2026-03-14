# Root-level Dockerfile for building the Frontend
# This allows running 'docker build .' from the root directory to build the UI

FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files from the sub-directory
COPY vaidika-ui/package*.json ./
RUN npm install

# Copy all frontend files
COPY vaidika-ui/ .

# Build the app
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.js ./

EXPOSE 3000
CMD ["npm", "start"]
