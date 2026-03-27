# Stage 1: Build frontend
FROM node:20-alpine AS builder
WORKDIR /build
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Runtime
FROM alpine:3.19
WORKDIR /pb

# PocketBase binary (must exist on build machine, gitignored)
COPY backend/pocketbase ./pocketbase
RUN chmod +x ./pocketbase

# Built frontend
COPY --from=builder /build/dist ./pb_public

# Hooks and migrations
COPY backend/pb_hooks ./pb_hooks
COPY backend/pb_migrations ./pb_migrations

VOLUME ["/pb/pb_data"]
EXPOSE 8080

CMD ["./pocketbase", "serve", \
     "--http=0.0.0.0:8080", \
     "--publicDir=/pb/pb_public", \
     "--dir=/pb/pb_data", \
     "--hooksDir=/pb/pb_hooks"]
