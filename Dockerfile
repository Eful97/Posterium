FROM node:20-bullseye AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install --ignore-scripts && npm rebuild
COPY . .
RUN npm run build

FROM node:20-bullseye AS runner
WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
