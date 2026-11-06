/**
 * Bastion ledger middleware for an Express app you operate.
 * The ingest key belongs in server configuration, not in a public page.
 */
export function bastionLedger({ ingestUrl, apiKey, siteHost }) {
  if (!ingestUrl || !apiKey) throw new Error("bastionLedger requires ingestUrl and apiKey");
  return function bastionLedgerMiddleware(req, res, next) {
    const started = Date.now();
    res.on("finish", () => {
      const payload = {
        method: req.method,
        path: req.originalUrl || req.url || "/",
        status: res.statusCode,
        ip: req.ip || req.socket?.remoteAddress || "",
        userAgent: req.get?.("user-agent") || req.headers["user-agent"] || "",
        referer: req.get?.("referer") || "",
        source: "server",
        host: siteHost,
        durationMs: Date.now() - started,
      };
      fetch(ingestUrl, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    });
    next();
  };
}

/**
 * Send an agent tool call. `content` is hashed by Bastion and not stored.
 * The JSON result includes `decision`: allow, flag, or deny.
 * If it is deny, do not run the tool. Bastion is not inside the process.
 */
export async function logAgentCall({ ingestUrl, apiKey, agentName, tool, outcome, content }) {
  const response = await fetch(ingestUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ agentName, tool, outcome, content }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bastion agent ingest failed: ${response.status} ${body}`);
  }
  return response.json();
}
