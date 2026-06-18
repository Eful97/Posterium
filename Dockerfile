FROM node:20-bullseye AS builder
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
ARG POSTERIUM_COMMIT=237b75ede53c2b58586666c2000afa01c2ae8fc2
RUN git clone https://github.com/Eful97/Posterium.git /app && cd /app && git checkout ${POSTERIUM_COMMIT}
WORKDIR /app
RUN rm -rf node_modules package-lock.json
RUN npm install
RUN npm run build

FROM node:20-bullseye AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS="--max-old-space-size=1536"

RUN addgroup --system --gid 1000 nodejs
RUN adduser --system --uid 1000 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && mkdir -p data && chown nextjs:nodejs data

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/live').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["/entrypoint.sh"]
