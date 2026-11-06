FROM node:22-bookworm-slim

WORKDIR /app
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY prisma ./prisma
# Generate does not connect. DIRECT_URL satisfies the Postgres schema during the image build.
ENV DATABASE_URL="file:/data/bastion.db"
ENV DIRECT_URL="postgresql://placeholder:placeholder@127.0.0.1:5432/bastion?schema=public"
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

ENV NODE_ENV=production
ENV AUTH_SECRET="change-me-before-any-shared-deployment"
ENV APP_URL="http://127.0.0.1:4317"
EXPOSE 4317
VOLUME ["/data"]

CMD ["sh", "-c", "npx prisma generate --schema prisma/schema.sqlite.prisma && npx prisma db push --schema prisma/schema.sqlite.prisma && npx tsx prisma/seed.ts && npm run start"]
