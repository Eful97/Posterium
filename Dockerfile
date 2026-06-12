FROM node:20-bullseye AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y fonts-liberation fonts-dejavu-core --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY package.json ./
RUN npm install --ignore-scripts && npm rebuild
COPY . .
RUN npm run build

FROM node:20-bullseye AS runner
WORKDIR /app
RUN apt-get update && apt-get install -y fonts-liberation fonts-dejavu-core --no-install-recommends && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "node_modules/.bin/next", "start"]
