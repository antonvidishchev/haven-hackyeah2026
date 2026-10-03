# syntax=docker/dockerfile:1
FROM node:24-alpine AS build
RUN npm install -g pnpm@12.3.4
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @haven/api...
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @haven/shared build && pnpm --filter @haven/api build \
  && pnpm --filter @haven/api deploy --prod --legacy /out

FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
# Owned by node, so a new evidence volume mounted here is writable by the API.
RUN mkdir -p /data/evidence && chown node:node /data/evidence
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
