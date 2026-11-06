import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { directUrlSource, resolveDirectUrl, shouldSeedDemo } from "../scripts/direct-url.mjs";

describe("Neon direct URL", () => {
  it("uses DATABASE_URL_UNPOOLED when DIRECT_URL is unset", () => {
    const env = {
      DATABASE_URL: "postgresql://pooled",
      DATABASE_URL_UNPOOLED: "postgresql://unpooled",
      POSTGRES_URL_NON_POOLING: "postgresql://nonpooling",
    };
    expect(resolveDirectUrl(env)).toBe("postgresql://unpooled");
    expect(directUrlSource(env)).toBe("DATABASE_URL_UNPOOLED");
  });

  it("falls back to DATABASE_URL and then POSTGRES_URL_NON_POOLING", () => {
    expect(resolveDirectUrl({ DATABASE_URL: "postgresql://pooled", POSTGRES_URL_NON_POOLING: "postgresql://nonpooling" })).toBe("postgresql://pooled");
    expect(resolveDirectUrl({ POSTGRES_URL_NON_POOLING: "postgresql://nonpooling" })).toBe("postgresql://nonpooling");
    expect(resolveDirectUrl({ DIRECT_URL: "  ", DATABASE_URL_UNPOOLED: "postgresql://unpooled" })).toBe("postgresql://unpooled");
    expect(resolveDirectUrl({ DIRECT_URL: "postgresql://explicit", DATABASE_URL_UNPOOLED: "postgresql://unpooled" })).toBe("postgresql://explicit");
  });

  it("seeds on deploy only when SEED_DEMO is exactly true", () => {
    expect(shouldSeedDemo({ SEED_DEMO: "true" })).toBe(true);
    expect(shouldSeedDemo({})).toBe(false);
    expect(shouldSeedDemo({ SEED_DEMO: "1" })).toBe(false);
    expect(shouldSeedDemo({ SEED_DEMO: "TRUE" })).toBe(false);
  });

  it("accepts a Neon-style environment without DIRECT_URL", () => {
    const result = spawnSync(process.execPath, ["scripts/check-vercel-env.mjs"], {
      env: {
        PATH: process.env.PATH,
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://pooled.example/bastion",
        DATABASE_URL_UNPOOLED: "postgresql://direct.example/bastion",
        AUTH_SECRET: "a".repeat(32),
      },
    });
    expect(result.status).toBe(0);
  });
});
