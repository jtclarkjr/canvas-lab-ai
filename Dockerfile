# syntax=docker/dockerfile:1

FROM node:24-slim AS bun-base
ARG BUN_VERSION=1.3.14
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global "bun@${BUN_VERSION}"
WORKDIR /app

FROM bun-base AS build-dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM build-dependencies AS build
COPY . .
RUN ./node_modules/.bin/svelte-kit sync \
  && bun run agent:build

FROM node:24-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist-agent ./dist-agent
COPY --chown=node:node package.json ./package.json
USER node
CMD ["node", "dist-agent/canvas-transcriber.js", "start"]
