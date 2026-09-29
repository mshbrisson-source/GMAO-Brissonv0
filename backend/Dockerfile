FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate --schema prisma/schema.prisma

COPY src ./src

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push --schema prisma/schema.prisma && node prisma/seed.js && node src/server.js"]
