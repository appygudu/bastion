import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { directUrlSource, resolveDirectUrl, shouldSeedDemo } from "./direct-url.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = directUrlSource();
const direct = resolveDirectUrl();
if (direct && source !== "DIRECT_URL") {
  console.log(`DIRECT_URL is unset. prisma migrate deploy will use ${source}. The running app keeps DATABASE_URL and does not read DIRECT_URL.`);
  process.env.DIRECT_URL = direct;
}

function run(bin, args) {
  const result = spawnSync(bin, args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}

const node = process.execPath;
run(node, ["scripts/check-vercel-env.mjs"]);
run(path.join(root, "node_modules", ".bin", "prisma"), ["generate"]);
run(path.join(root, "node_modules", ".bin", "prisma"), ["migrate", "deploy"]);
if (shouldSeedDemo()) {
  console.log("SEED_DEMO=true. Seeding the labelled demo workspace when that email is not already present.");
  run(path.join(root, "node_modules", ".bin", "tsx"), ["prisma/seed.ts"]);
} else {
  console.log("SEED_DEMO is not true. Demo data is left unchanged.");
}
run(path.join(root, "node_modules", ".bin", "next"), ["build"]);
