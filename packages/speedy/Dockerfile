# Multi-stage build для прод-образа speedy.
# В dev используем хостовой Node + tsx watch, контейнеризация не нужна.

FROM node:20-alpine AS build
WORKDIR /repo
RUN npm i -g pnpm@9.12.0
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/ginzu ./packages/ginzu
COPY packages/speedy ./packages/speedy
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @kakdela/speedy build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /repo/packages/speedy/dist ./dist
COPY --from=build /repo/packages/speedy/package.json ./
COPY --from=build /repo/node_modules ./node_modules
EXPOSE 3001
CMD ["node", "dist/index.js"]
