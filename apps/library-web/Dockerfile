# LibraStack Web — static SPA behind nginx
FROM node:24-bookworm-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/opac/package.json apps/opac/
COPY apps/kiosk/package.json apps/kiosk/
COPY apps/api/package.json apps/api/
COPY packages/ packages/

RUN npm ci --workspace=@librastack/web

COPY apps/web/ apps/web/

ARG VITE_API_URL
ARG VITE_DEFAULT_TENANT_SLUG=ulmis
ARG VITE_APP_NAME="University Library"
ARG VITE_OPAC_URL
ARG VITE_KIOSK_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_DEFAULT_TENANT_SLUG=${VITE_DEFAULT_TENANT_SLUG}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_OPAC_URL=${VITE_OPAC_URL}
ENV VITE_KIOSK_URL=${VITE_KIOSK_URL}

RUN npm run build --workspace=@librastack/web

FROM nginx:1.27-alpine AS runtime

COPY infrastructure/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
