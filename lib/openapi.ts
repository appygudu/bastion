export function openApiSpec(origin: string) {
  return {
    openapi: "3.1.0",
    info: {
      title: "Bastion API",
      version: "2026-10-23",
      description: "Workspace API. Ingest keys authenticate ledger and agent events. API keys authenticate scans and carry scopes. There is no SCIM API.",
    },
    servers: [{ url: origin }],
    components: {
      securitySchemes: {
        ingestKey: { type: "http", scheme: "bearer", description: "Property ingest key, shown once when the property is created." },
        apiKey: { type: "http", scheme: "bearer", description: "Workspace API key. Scopes are scans:read and scans:write." },
      },
    },
    paths: {
      "/api/v1/traffic": {
        post: {
          summary: "Append a request to the crawler ledger",
          security: [{ ingestKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["method", "path", "ip", "userAgent", "source"],
                  properties: {
                    method: { type: "string" },
                    path: { type: "string" },
                    status: { type: "integer" },
                    ip: { type: "string" },
                    userAgent: { type: "string" },
                    referer: { type: "string" },
                    source: { type: "string", enum: ["server", "browser", "manual"] },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Event stored. The response includes the chain hash." } },
        },
      },
      "/api/v1/agent-events": {
        post: {
          summary: "Log an agent tool call and return a guardrail decision",
          description: "The prompt content is hashed and discarded. decision is allow, flag, or deny. Bastion does not run inside the agent. The caller enforces deny.",
          security: [{ ingestKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["agentName", "tool", "outcome"],
                  properties: {
                    agentName: { type: "string" },
                    tool: { type: "string" },
                    outcome: { type: "string" },
                    content: { type: "string", description: "Evaluated, then hashed. Not stored." },
                  },
                },
              },
            },
          },
          responses: { "200": { description: "Returns id, promptHash, findings, and decision." } },
        },
      },
      "/api/v1/scans": {
        get: {
          summary: "List recent scans",
          security: [{ apiKey: [] }],
          responses: { "200": { description: "Requires scans:read." } },
        },
        post: {
          summary: "Run a passive scan",
          description: "The body must include attested: true. The same SSRF checks as the workspace scanner apply.",
          security: [{ apiKey: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url", "attested"],
                  properties: { url: { type: "string" }, attested: { type: "boolean", const: true } },
                },
              },
            },
          },
          responses: { "200": { description: "Requires scans:write. Returns id and score." } },
        },
      },
      "/api/v1/scans/{id}": {
        get: {
          summary: "Read one scan",
          security: [{ apiKey: [] }],
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Requires scans:read." } },
        },
      },
      "/api/status": {
        get: { summary: "Health of this deployment", responses: { "200": { description: "Database, scheduler, email, and SSO configuration. No secrets." } } },
      },
    },
  };
}
