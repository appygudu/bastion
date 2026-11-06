import { NextResponse } from "next/server";
import { trafficPayload, verifyChain } from "@/lib/audit/hashchain";
import { requireApiUser } from "@/lib/api";
import { spreadsheetCell } from "@/lib/csv";
import { prisma } from "@/lib/db";

function readJsonArray(raw: string): unknown[] {
  try {
    const value = JSON.parse(raw) as unknown;
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { user, error } = await requireApiUser();
  if (!user || error) return error;
  const url = new URL(request.url);
  const siteId = url.searchParams.get("siteId") ?? "";
  const format = url.searchParams.get("format") === "csv" ? "csv" : "json";
  const site = await prisma.site.findFirst({ where: { id: siteId, userId: user.id } });
  if (!site) return NextResponse.json({ error: "Property not found." }, { status: 404 });
  const rows = await prisma.trafficEvent.findMany({ where: { siteId: site.id }, orderBy: { seq: "asc" } });
  const chain = verifyChain(rows.map((row) => ({
    prevHash: row.prevHash,
    hash: row.hash,
    payload: trafficPayload({
      id: row.id,
      occurredAt: row.occurredAt,
      siteId: row.siteId,
      method: row.method,
      path: row.path,
      status: row.status,
      ip: row.ip,
      userAgent: row.userAgent,
      agent: row.agent,
      category: row.category,
      source: row.source,
      anomalyCodes: row.anomalyCodes,
    }),
  })));
  if (format === "csv") {
    const header = ["seq", "occurredAt", "method", "path", "status", "ip", "userAgent", "agent", "category", "source", "anomalyCodes", "prevHash", "hash"];
    const lines = [header.join(",")];
    for (const row of rows) {
      lines.push([
        String(row.seq),
        row.occurredAt,
        row.method,
        row.path,
        String(row.status ?? ""),
        row.ip,
        row.userAgent,
        row.agent,
        row.category,
        row.source,
        row.anomalyCodes,
        row.prevHash,
        row.hash,
      ].map((value) => spreadsheetCell(String(value))).join(","));
    }
    return new Response(lines.join("\n"), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": "attachment; filename=\"bastion-ledger.csv\"",
      },
    });
  }
  return NextResponse.json({
    site: site.hostname,
    chainValid: chain.ok,
    brokenAt: chain.brokenAt ?? null,
    events: rows.map((row) => ({
      seq: row.seq,
      occurredAt: row.occurredAt,
      method: row.method,
      path: row.path,
      status: row.status,
      ip: row.ip,
      userAgent: row.userAgent,
      agent: row.agent,
      vendor: row.vendor,
      category: row.category,
      source: row.source,
      anomalies: readJsonArray(row.anomalyJson),
      prevHash: row.prevHash,
      hash: row.hash,
      demo: row.isDemo,
    })),
  });
}
