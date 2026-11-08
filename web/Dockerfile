# Officium Local, web. Build from the root of this tree:  docker build -t officium-web .
# Runtime configuration (compose service `web`):
#   OFFICIUM_API_URL      where the Local API listens (default http://127.0.0.1:8190; in compose, http://api:8080)
#   OFFICIUM_LOCAL_TOKEN  optional; when set, the web adds "Authorization: Bearer <token>" to every API call, server-side
FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
# Build-time flag: inlined into the client bundle, so it is set here and not at run time.
ENV NEXT_PUBLIC_OFFICIUM_EDITION=local
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter @javadaba/officium build

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV OFFICIUM_API_URL=http://127.0.0.1:8190
COPY --from=build /app/packages/apps/officium/.next/standalone ./
COPY --from=build /app/packages/apps/officium/.next/static ./packages/apps/officium/.next/static
USER node
EXPOSE 3000
CMD ["node", "packages/apps/officium/server.js"]
