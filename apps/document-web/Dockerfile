# =============================================================================
# CDTS Web — Vite build + nginx static server
# =============================================================================
FROM node:22-alpine AS build
WORKDIR /app

ARG VITE_API_URL=
ARG VITE_SENTRY_DSN=
ARG VITE_APP_VERSION=1.0.0

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV VITE_APP_VERSION=$VITE_APP_VERSION

COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine AS production

RUN apk add --no-cache gettext \
  && addgroup -g 1001 -S cdts && adduser -S cdts -u 1001 -G cdts

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

RUN mkdir -p /etc/nginx/conf.d /var/cache/nginx /var/log/nginx /var/run \
  && chown -R cdts:cdts /var/cache/nginx /var/log/nginx /etc/nginx/conf.d /var/run \
  && touch /var/run/nginx.pid && chown cdts:cdts /var/run/nginx.pid

USER cdts
ENV PORT=8080
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD sh -c 'wget -qO- "http://127.0.0.1:${PORT:-8080}/health" || exit 1'

ENTRYPOINT ["/docker-entrypoint.sh"]
