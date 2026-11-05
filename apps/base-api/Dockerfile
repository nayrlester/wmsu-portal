FROM node:22-alpine AS deps
WORKDIR /app
RUN apk add --no-cache python3 make g++
ENV NPM_CONFIG_PRODUCTION=false
COPY package.json package-lock.json* ./
RUN npm install --include=dev

FROM node:22-alpine AS build
WORKDIR /app
ENV NPM_CONFIG_PRODUCTION=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN test -f ace.js
RUN npm rebuild @swc/core
RUN node ace.js build --ignore-ts-errors
RUN npm prune --omit=dev

FROM node:22-alpine AS production
WORKDIR /app

RUN apk add --no-cache curl \
  && addgroup -g 1001 -S wmsu \
  && adduser -S wmsu -u 1001 -G wmsu

ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=build --chown=wmsu:wmsu /app/build ./
COPY --from=build --chown=wmsu:wmsu /app/node_modules ./node_modules
COPY --from=build --chown=wmsu:wmsu /app/package.json ./package.json
COPY --from=build --chown=wmsu:wmsu /app/ace.js ./ace.js

USER wmsu
EXPOSE 3500

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -fsS "http://127.0.0.1:${PORT:-3500}/api/v1/health/live" || exit 1

CMD ["node", "bin/server.js"]
