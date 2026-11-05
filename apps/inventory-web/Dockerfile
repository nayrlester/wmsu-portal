# =============================================================================
# UIMS Web — Vite build + nginx (Railway / Docker)
# Build context: web/  — installs deps without a local lockfile (workspace leaf).
# Prefer Dockerfile.web.railway from repo root when deploying from monorepo.
# =============================================================================
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=
ARG VITE_APP_ENV=production

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_ENV=$VITE_APP_ENV

COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext \
  && addgroup -g 1001 -S uims \
  && adduser -S uims -u 1001 -G uims

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /etc/nginx/conf.d /var/cache/nginx /var/log/nginx /var/run \
  && chown -R uims:uims /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run \
  && touch /var/run/nginx.pid && chown uims:uims /var/run/nginx.pid

USER uims
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-8080}/health" || exit 1'

CMD ["/docker-entrypoint.sh"]
