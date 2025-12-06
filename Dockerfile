FROM node:18-slim

# Install OpenSSL and other dependencies for Prisma
RUN apt-get update -y && apt-get install -y openssl libssl-dev ca-certificates

WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy proto files
COPY proto ./proto/

# Copy prisma schema
COPY prisma ./prisma/
RUN npx prisma generate

COPY . .

EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]