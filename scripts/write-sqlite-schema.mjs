import { readFileSync, writeFileSync } from "node:fs";

const sourcePath = new URL("../prisma/schema.prisma", import.meta.url);
const outPath = new URL("../prisma/schema.sqlite.prisma", import.meta.url);
const source = readFileSync(sourcePath, "utf8");
const marker = /datasource db \{[\s\S]*?\n\}/;
if (!marker.test(source)) {
  console.error("prisma/schema.prisma is missing a datasource block.");
  process.exit(1);
}
const sqlite = [
  "// Generated from prisma/schema.prisma by scripts/write-sqlite-schema.mjs. Do not edit.",
  source.replace(
    marker,
    'datasource db {\n  provider = "sqlite"\n  url      = env("DATABASE_URL")\n}',
  ),
].join("\n");
if (process.argv.includes("--check")) {
  const current = readFileSync(outPath, "utf8");
  if (current !== sqlite) {
    console.error("prisma/schema.sqlite.prisma is stale. Run: node scripts/write-sqlite-schema.mjs");
    process.exit(1);
  }
  process.exit(0);
}
writeFileSync(outPath, sqlite);
