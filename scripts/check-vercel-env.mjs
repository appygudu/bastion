import { directUrlSource, resolveDirectUrl } from "./direct-url.mjs";

const missing = ["DATABASE_URL", "AUTH_SECRET"].filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Set these Vercel environment variables before deploying: ${missing.join(", ")}.`);
  process.exit(1);
}
if (!process.env.DATABASE_URL.startsWith("postgres")) {
  console.error("DATABASE_URL must be a Postgres URL on Vercel. A SQLite file does not survive the serverless filesystem.");
  process.exit(1);
}
const migrationUrl = resolveDirectUrl();
if (!migrationUrl.startsWith("postgres")) {
  console.error(
    "Migrations need a Postgres URL. Neon sets DATABASE_URL_UNPOOLED. DIRECT_URL is optional when DATABASE_URL_UNPOOLED, DATABASE_URL, or POSTGRES_URL_NON_POOLING is set.",
  );
  process.exit(1);
}
if (process.env.AUTH_SECRET.length < 32) {
  console.error("AUTH_SECRET must be at least 32 characters.");
  process.exit(1);
}
const source = directUrlSource();
if (source !== "DIRECT_URL") {
  console.log(`DIRECT_URL is unset. Migrations will use ${source}.`);
}
