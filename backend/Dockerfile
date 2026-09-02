FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --only=production

COPY src ./src

RUN mkdir -p uploads logs

COPY start.sh ./
RUN chmod +x ./start.sh

EXPOSE 5000

CMD ["sh", "start.sh"]
