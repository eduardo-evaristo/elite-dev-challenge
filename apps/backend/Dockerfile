FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/backend/package.json apps/backend/
RUN npm ci

COPY packages/shared/ packages/shared/
COPY apps/backend/ apps/backend/

RUN cd apps/backend && npx prisma generate
RUN cd apps/backend && npm run build

FROM node:20-alpine AS runner
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=builder /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/src/generated ./apps/backend/src/generated
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/apps/backend/prisma.config.ts ./apps/backend/prisma.config.ts

EXPOSE 3000
CMD ["sh", "-c", "cd apps/backend && npx prisma db push && node prisma/seed.js && node dist/src/main.js"]
