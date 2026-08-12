# syntax=docker/dockerfile:1

FROM node:24-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@11

# Install dependencies (dev + prod) to run the build
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Build the NestJS app
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

# Prune dev dependencies for a smaller runtime image
FROM deps AS prod
RUN pnpm prune --prod
COPY --from=build /app/dist ./dist
COPY package.json ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/main"]
