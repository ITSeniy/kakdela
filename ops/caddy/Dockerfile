# Caddy + статика web-клиента (Polly в browser-режиме, без Tauri).
# Контекст сборки — корень репозитория:
#   docker build -f ops/caddy/Dockerfile .
#
# VITE_*-переменные запекаются в бандл на этапе сборки — они приходят
# build-args'ами из docker-compose.app.yml (тот берёт их из .env).

FROM node:20-alpine AS web

WORKDIR /repo
RUN npm i -g pnpm@9.12.0

# tsconfig.base.json нужен: polly/ginzu extend'ят его, без него tsc -b
# теряет strict/target и сборка падает.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc tsconfig.base.json ./
COPY packages/ginzu/package.json      packages/ginzu/
COPY packages/speedy/package.json     packages/speedy/
COPY packages/francine/package.json   packages/francine/
COPY packages/big-cheese/package.json packages/big-cheese/
COPY packages/polly/package.json      packages/polly/
RUN pnpm install --frozen-lockfile --filter @kakdela/polly...

COPY packages/ginzu packages/ginzu
COPY packages/polly packages/polly

ARG VITE_SPEEDY_URL
ARG VITE_SPEEDY_WS_URL
ARG VITE_LIVEKIT_URL
ENV VITE_SPEEDY_URL=$VITE_SPEEDY_URL \
    VITE_SPEEDY_WS_URL=$VITE_SPEEDY_WS_URL \
    VITE_LIVEKIT_URL=$VITE_LIVEKIT_URL

RUN pnpm --filter @kakdela/polly build

FROM caddy:2-alpine
COPY ops/caddy/Caddyfile.prod /etc/caddy/Caddyfile
COPY --from=web /repo/packages/polly/dist /srv/web
