# ─── Stage 1: Build with Node ───
FROM node:20-alpine AS build
WORKDIR /build

# Cache node_modules layer (lockfile changes less often than sources)
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ .
RUN npm run build

# ─── Stage 2: nginx runtime ───
FROM nginx:1.27-alpine

COPY release/nginx.conf /etc/nginx/conf.d/default.conf
# Strip UTF-8 BOM if present (Windows editors sometimes add it)
RUN sed -i "1s/^$(printf '\xef\xbb\xbf')//" /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

RUN sed -i 's#^pid .*#pid /tmp/nginx.pid;#' /etc/nginx/nginx.conf \
    && chown -R nginx:nginx /usr/share/nginx/html /etc/nginx/conf.d /etc/nginx/nginx.conf \
    && mkdir -p /var/cache/nginx /var/log/nginx \
    && chown -R nginx:nginx /var/cache/nginx /var/log/nginx

USER nginx
EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --retries=3 --start-period=10s \
  CMD wget -qO- http://127.0.0.1:8080/ || exit 1
