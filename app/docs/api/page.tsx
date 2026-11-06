import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { openApiSpec } from "@/lib/openapi";
import { appOrigin } from "@/lib/public-env";

export const metadata = { title: "API" };

export default function ApiDocsPage() {
  const spec = openApiSpec(appOrigin());
  const paths = Object.entries(spec.paths);
  return (
    <div className="grid-fade min-h-screen">
      <SiteHeader />
      <main id="content" className="mx-auto max-w-3xl px-4 py-12 text-sm leading-6 text-muted sm:px-5">
        <h1 className="font-serif text-5xl text-paper">API</h1>
        <p className="mt-4">Machine-readable spec: <Link className="text-brass underline" href="/api/openapi.json">/api/openapi.json</Link>. The same object renders this page.</p>
        <h2 className="mt-8 font-serif text-3xl text-paper">Agent ingest</h2>
        <pre className="mt-3 overflow-x-auto bg-ink-2 p-3 font-mono text-xs text-paper">{`import { logAgentCall } from "./sdk/node/bastion.js";

const result = await logAgentCall({
  ingestUrl: "${appOrigin()}/api/v1/agent-events",
  apiKey: process.env.BASTION_INGEST_KEY,
  agentName: "checkout-bot",
  tool: "lookup_order",
  outcome: "success",
  content: toolInput,
});

if (result.decision === "deny") {
  // Do not run the tool. Bastion is not inside the process.
}`}</pre>
        <p className="mt-3">Property ingest keys and workspace API keys are different. Scans use a workspace key. Ledger and agent events use the property key from Settings.</p>
        <ul className="mt-8 space-y-6">
          {paths.map(([path, methods]) => (
            <li key={path} className="list-none border-t border-line pt-4">
              {Object.entries(methods as Record<string, { summary: string; description?: string }>).map(([method, operation]) => (
                <div key={method}>
                  <p className="font-mono text-xs text-brass">{method.toUpperCase()} {path}</p>
                  <p className="mt-1 text-paper">{operation.summary}</p>
                  {operation.description ? <p className="mt-1">{operation.description}</p> : null}
                </div>
              ))}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
