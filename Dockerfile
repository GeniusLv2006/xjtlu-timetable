# Stage 1: Build frontend
FROM node:24.18.0-alpine3.24 AS builder
WORKDIR /build
RUN corepack enable
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ ./
RUN pnpm build

# Stage 2: Build PocketBase from its pinned release commit with patched Go
# dependencies. The upstream 0.39.7 binary contains x/image versions affected
# by image-decoder denial-of-service advisories.
FROM golang:1.26.5-alpine3.24 AS pocketbase
ARG POCKETBASE_VERSION=0.39.7
ARG POCKETBASE_COMMIT=636b7e28d8ffd3829f501f28f3725facf62a4042
ARG POCKETBASE_SOURCE_SHA256=b08b9b421536c9866c96590c6295c6ae19728e7102d245328aae54a3cbb053b7
ARG GO_IMAGE_VERSION=0.44.0
RUN apk add --no-cache curl \
    && archive="pocketbase-${POCKETBASE_COMMIT}.tar.gz" \
    && curl --fail --location --proto '=https' --tlsv1.2 \
         --output "/tmp/$archive" \
         "https://github.com/pocketbase/pocketbase/archive/${POCKETBASE_COMMIT}.tar.gz" \
    && echo "$POCKETBASE_SOURCE_SHA256  /tmp/$archive" | sha256sum -c - \
    && mkdir -p /src /out \
    && tar -xzf "/tmp/$archive" --strip-components=1 -C /src \
    && cd /src \
    && go mod edit -require="golang.org/x/image@v${GO_IMAGE_VERSION}" \
    && CGO_ENABLED=0 go build -mod=mod -trimpath \
         -ldflags="-s -w -X github.com/pocketbase/pocketbase.Version=${POCKETBASE_VERSION}" \
         -o /out/pocketbase ./examples/base

# Stage 3: Runtime
FROM alpine:3.24.1
WORKDIR /pb
LABEL org.opencontainers.image.source="https://github.com/GeniusLv2006/xjtlu-timetable" \
      org.opencontainers.image.description="XJTLU timetable application" \
      org.opencontainers.image.licenses="MIT"

# Verified PocketBase binary
COPY --from=pocketbase /out/pocketbase ./pocketbase

# Built frontend
COPY --from=builder /build/dist ./pb_public

# Hooks and migrations
COPY backend/pb_hooks ./pb_hooks
COPY backend/pb_migrations ./pb_migrations

VOLUME ["/pb/pb_data"]
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/api/health || exit 1

CMD ["./pocketbase", "serve", \
     "--http=0.0.0.0:8080", \
     "--publicDir=/pb/pb_public", \
     "--dir=/pb/pb_data", \
     "--hooksDir=/pb/pb_hooks", \
     "--migrationsDir=/pb/pb_migrations"]
