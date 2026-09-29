# ================ Stage 1: Build ==================
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY . .
RUN npm run build

# ================ Stage 2: Production =================
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache openssl bash

COPY package*.json ./
RUN npm install --omit=dev

COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3003
CMD ["/entrypoint.sh"]
