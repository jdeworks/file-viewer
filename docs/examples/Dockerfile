# ── Stage 1: Build ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
LABEL maintainer="demo@example.com"
WORKDIR /app
ARG BUILD_ENV=production
ENV NODE_ENV=${BUILD_ENV}
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/
RUN npm run build

# ── Stage 2: Runtime ────────────────────────────────────────────────
FROM nginx:1.25-alpine AS runtime
LABEL version="2.0.0"
LABEL description="Demo multi-stage web application"
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
EXPOSE 443
ENV APP_VERSION=2.0.0
USER nginx
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q --spider http://localhost/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
