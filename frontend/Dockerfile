# Next.js standalone 빌드 (Dokploy/Docker 배포용). 빌드 컨텍스트 = frontend/
# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# rewrites()의 타일 프록시 주소는 빌드 시 구워진다 → 빌드 ARG로 주입(기본값=백엔드 LAN 주소)
ARG PL3XMAP_BASE_URL=http://10.10.20.10:8080
ENV PL3XMAP_BASE_URL=$PL3XMAP_BASE_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# 런타임에서 Route Handler(SSE relay 등)가 읽는 백엔드 주소
ARG PL3XMAP_BASE_URL=http://10.10.20.10:8080
ENV PL3XMAP_BASE_URL=$PL3XMAP_BASE_URL

RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
