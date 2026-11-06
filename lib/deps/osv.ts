import type { PackageRef } from "./parse";

export interface OsvVuln {
  id: string;
  summary: string;
  aliases: string[];
  severity: { type: string; score: string }[];
}

export interface PackageResult {
  name: string;
  ecosystem: string;
  version: string | null;
  exact: boolean;
  note: string;
  vulns: OsvVuln[];
  error?: string;
}

interface OsvResponse {
  results?: { vulns?: { id?: string; modified?: string }[] }[];
}

export async function queryOsv(packages: PackageRef[]): Promise<PackageResult[]> {
  const limited = packages.slice(0, 40);
  const queryable = limited.filter((pkg) => pkg.version);
  const results = new Map<number, OsvVuln[]>();
  if (queryable.length) {
    const response = await fetch("https://api.osv.dev/v1/querybatch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "Bastion/0.1 (defensive dependency review)",
      },
      body: JSON.stringify({
        queries: queryable.map((pkg) => ({
          version: pkg.version,
          package: { name: pkg.name, ecosystem: pkg.ecosystem },
        })),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`OSV.dev returned HTTP ${response.status}.`);
    const data = (await response.json()) as OsvResponse;
    const ids = new Set<string>();
    (data.results ?? []).forEach((result, index) => {
      for (const vuln of result.vulns ?? []) {
        if (vuln.id) ids.add(vuln.id);
      }
      results.set(index, []);
    });
    const details = await mapPool([...ids], 6, async (id) => {
      const detail = await fetch(`https://api.osv.dev/v1/vulns/${encodeURIComponent(id)}`, {
        headers: { "user-agent": "Bastion/0.1 (defensive dependency review)" },
        signal: AbortSignal.timeout(15_000),
      });
      if (!detail.ok) return null;
      const body = (await detail.json()) as {
        id?: string;
        summary?: string;
        aliases?: string[];
        severity?: { type?: string; score?: string }[];
      };
      if (!body.id) return null;
      return {
        id: body.id,
        summary: body.summary ?? "",
        aliases: body.aliases ?? [],
        severity: (body.severity ?? []).map((item) => ({ type: item.type ?? "", score: item.score ?? "" })),
      } satisfies OsvVuln;
    });
    const byId = new Map(details.filter((item): item is OsvVuln => Boolean(item)).map((item) => [item.id, item]));
    (data.results ?? []).forEach((result, index) => {
      results.set(
        index,
        (result.vulns ?? []).flatMap((vuln) => (vuln.id && byId.get(vuln.id) ? [byId.get(vuln.id)!] : [])),
      );
    });
  }
  let queryIndex = 0;
  return limited.map((pkg) => {
    if (!pkg.version) {
      return { ...pkg, vulns: [] };
    }
    const vulns = results.get(queryIndex) ?? [];
    queryIndex += 1;
    return { ...pkg, vulns };
  });
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await fn(items[current]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}
