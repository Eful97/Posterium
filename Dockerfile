FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y fonts-noto && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN rm -f package-lock.json && npm install

COPY . .

RUN mkdir -p data

ENV NODE_ENV=production
ENV PORT=7860

RUN npm run build --no-lint

EXPOSE 7860

CMD ["npm", "run", "start"]
