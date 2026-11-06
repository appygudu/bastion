import { spawnSync } from "node:child_process";
import { directUrlSource, resolveDirectUrl } from "./direct-url.mjs";

const command = process.argv.slice(2);
if (!command.length) {
  console.error("Usage: node scripts/with-direct-url.mjs <command> [args...]");
  process.exit(1);
}
const direct = resolveDirectUrl();
if (!direct) {
  console.error(
    "Set DIRECT_URL, or let the build derive it from DATABASE_URL_UNPOOLED, DATABASE_URL, or POSTGRES_URL_NON_POOLING.",
  );
  process.exit(1);
}
const source = directUrlSource();
if (source !== "DIRECT_URL") {
  console.log(`DIRECT_URL is unset. Using ${source} for this command.`);
}
const result = spawnSync(command[0], command.slice(1), {
  stdio: "inherit",
  env: { ...process.env, DIRECT_URL: direct },
});
if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}
process.exit(result.status ?? 1);
