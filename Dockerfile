
# --- ЭТАП 1: Установка зависимостей ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# --- ЭТАП 2: Сборка проекта ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG APP_VERSION
ENV NEXT_PUBLIC_APP_VERSION=$APP_VERSION

# Отключаем телеметрию Next.js для ускорения
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# --- ЭТАП 3: Финальный образ (Production) ---
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Создаем системного пользователя для безопасности
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Копируем ТОЛЬКО необходимые файлы из этапа сборки
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/src/scripts ./scripts

USER nextjs

EXPOSE 3000
ENV PORT=3000

# Запускаем через встроенный сервер node (быстрее и легче, чем npm start)
CMD ["node", "server.js"]