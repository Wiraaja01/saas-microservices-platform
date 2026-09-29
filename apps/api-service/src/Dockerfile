# Stage 1: Build menggunakan image Node.js alpine 18
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .

# Stage 2: Production
FROM node:18-alpine
WORKDIR /app
RUN apk add --no-cache openssl
COPY package*.json ./
RUN npm ci --only=production
# Copy file yang dibutuhkan dari stage builder berupa node_modules prisma dan src
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src ./src

EXPOSE 4000
# Jalankan perintah untuk memulai aplikasi
CMD ["sh", "-c", "npx prisma db push --skip-generate && node src/index.js"]
