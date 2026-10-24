#Stage 1 pre-build

FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./

COPY prisma ./prisma/

RUN npm ci

RUN npx prisma generate

COPY . .

#Stage 2 Production

FROM node:22-alpine

WORKDIR /app

RUN apk add openssl

COPY package*.json ./

RUN npm ci --only=production

#copy semua kebutuhan prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

EXPOSE  4000

CMD ["npm", "start"]







