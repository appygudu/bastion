/** @param {Record<string, string | undefined>} [env] */
export function resolveDirectUrl(env = process.env) {
  const candidates = [
    env.DIRECT_URL,
    env.DATABASE_URL_UNPOOLED,
    env.DATABASE_URL,
    env.POSTGRES_URL_NON_POOLING,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/** @param {Record<string, string | undefined>} [env] */
export function directUrlSource(env = process.env) {
  if (typeof env.DIRECT_URL === "string" && env.DIRECT_URL.trim()) return "DIRECT_URL";
  if (typeof env.DATABASE_URL_UNPOOLED === "string" && env.DATABASE_URL_UNPOOLED.trim()) return "DATABASE_URL_UNPOOLED";
  if (typeof env.DATABASE_URL === "string" && env.DATABASE_URL.trim()) return "DATABASE_URL";
  if (typeof env.POSTGRES_URL_NON_POOLING === "string" && env.POSTGRES_URL_NON_POOLING.trim()) return "POSTGRES_URL_NON_POOLING";
  return "";
}

/** @param {Record<string, string | undefined>} [env] */
export function shouldSeedDemo(env = process.env) {
  return env.SEED_DEMO === "true";
}
