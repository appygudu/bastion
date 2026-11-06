import { analyze } from "./analyze";
import { headerLine, safeFetch } from "./http";
import { PATH_CHECKS } from "./paths";
import { scoreFindings } from "./score";
import type { PathProbe, ScanObservation, TextFetch } from "@/lib/types";

const PROBE_ORIGIN = "https://bastion-probe.invalid";

export function scanBudgetMs(): number {
  const parsed = Number(process.env.BASTION_SCAN_BUDGET_MS ?? 45_000);
  if (!Number.isFinite(parsed) || parsed < 1_000) return 45_000;
  return Math.min(parsed, 55_000);
}

function remainingBudget(started: number): number {
  return scanBudgetMs() - (Date.now() - started);
}

function assertBudget(started: number) {
  if (remainingBudget(started) < 500) {
    throw new Error("Scan exceeded the time budget. The function stopped before the platform killed it.");
  }
}

function budgetError(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Scan exceeded the time budget");
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}

async function readText(url: string): Promise<TextFetch> {
  try {
    const response = await safeFetch(url, { method: "GET", maxBytes: 32_768, timeoutMs: 6000, redirects: 2 });
    return { status: response.status, body: response.status === 200 ? response.body : null };
  } catch (error) {
    return { status: null, body: null, error: error instanceof Error ? error.message : "Request failed" };
  }
}

function gitRef(path: string, body: string): string | null {
  if (path !== "/.git/HEAD") return null;
  const line = body.split(/\r?\n/, 1)[0]?.trim() ?? "";
  if (/^ref: refs\/heads\/[A-Za-z0-9._/-]+$/.test(line) || /^[a-f0-9]{40}$/.test(line)) return line;
  return null;
}

export async function runScan(rawUrl: string) {
  const started = Date.now();
  const document = await safeFetch(rawUrl, { method: "GET", maxBytes: 262_144, timeoutMs: 8000, redirects: 3 });
  const origin = new URL(document.finalUrl).origin;
  const cors = {
    requestOrigin: PROBE_ORIGIN,
    allowOrigin: null as string | null,
    allowCredentials: null as string | null,
    error: undefined as string | undefined,
  };
  assertBudget(started);
  const [robotsTxt, aiTxt, probes] = await Promise.all([
    readText(`${origin}/robots.txt`),
    readText(`${origin}/ai.txt`),
    mapPool(PATH_CHECKS, 4, async (check): Promise<PathProbe> => {
      try {
        assertBudget(started);
        const response = await safeFetch(`${origin}${check.path}`, {
          method: "HEAD",
          maxBytes: 256,
          timeoutMs: Math.min(5000, remainingBudget(started)),
          redirects: 0,
        });
        return {
          path: check.path,
          status: response.status,
          contentType: headerLine(response.headers, "content-type"),
          contentLength: headerLine(response.headers, "content-length"),
          gitRef: check.path === "/.git/HEAD" ? gitRef(check.path, response.body) : null,
        };
      } catch (error) {
        if (budgetError(error)) throw error;
        return {
          path: check.path,
          status: null,
          contentType: null,
          contentLength: null,
          gitRef: null,
          error: error instanceof Error ? error.message : "Probe failed",
        };
      }
    }),
  ]);
  try {
    assertBudget(started);
    const corsResponse = await safeFetch(origin, {
      method: "GET",
      maxBytes: 2048,
      timeoutMs: Math.min(6000, remainingBudget(started)),
      redirects: 1,
      headers: { Origin: PROBE_ORIGIN },
    });
    cors.allowOrigin = headerLine(corsResponse.headers, "access-control-allow-origin");
    cors.allowCredentials = headerLine(corsResponse.headers, "access-control-allow-credentials");
  } catch (error) {
    if (budgetError(error)) throw error;
    cors.error = error instanceof Error ? error.message : "CORS probe failed";
  }

  const observation: ScanObservation = {
    requestedUrl: rawUrl,
    finalUrl: document.finalUrl,
    status: document.status,
    headers: document.headers,
    bodySample: document.body.slice(0, 100_000),
    tls: document.tls,
    pathProbes: probes,
    robotsTxt,
    aiTxt,
    cors,
  };
  const analysis = analyze(observation);
  return {
    findings: analysis.findings,
    passes: analysis.passes,
    score: scoreFindings(analysis.findings),
    meta: {
      mode: "passive-live",
      requestedUrl: rawUrl,
      finalUrl: document.finalUrl,
      status: document.status,
      address: document.address,
      insecureRetry: document.insecureRetry,
      tls: document.tls,
      fingerprint: analysis.fingerprint,
      durationMs: Date.now() - started,
      robotsStatus: robotsTxt.status,
      aiTxtStatus: aiTxt.status,
      note: "Passive read-only requests. Response bodies from sensitive paths were not retained.",
    },
  };
}
