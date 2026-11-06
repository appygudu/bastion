import { ApiKeyForm, RevokeKeyButton, WebhookForm } from "@/components/developer-forms";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { workspaceLimits } from "@/lib/workspace/limits";

export const metadata = { title: "Developers" };

export default async function DevelopersPage() {
  const user = await requireUser();
  const [keys, hooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.webhookEndpoint.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ]);
  const limits = workspaceLimits(user.plan);
  const canWrite = user.role !== "viewer" && !user.isDemo;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Developers</p>
        <h1 className="mt-2 font-serif text-4xl">API keys and webhooks</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Keys use scopes scans:read and scans:write. The spec is at <a className="text-brass underline" href="/api/openapi.json">/api/openapi.json</a> and <a className="text-brass underline" href="/docs/api">/docs/api</a>. Ledger ingest still uses the property key from Settings, not these keys. This {user.plan} workspace allows {limits.apiKeys} active keys and {limits.webhooks} webhooks.</p>
      </div>
      <section>
        <h2 className="font-serif text-2xl">Keys</h2>
        {keys.length === 0 ? <p className="mt-3 text-sm text-muted">No API keys yet.</p> : (
          <ul className="mt-3 divide-y divide-line border border-line text-sm">
            {keys.map((key) => (
              <li key={key.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <span>{key.name} · <span className="font-mono text-xs">{key.prefix}…</span> · {key.scopes}{key.revokedAt ? " · revoked" : ""}</span>
                {!key.revokedAt && canWrite ? <RevokeKeyButton id={key.id} /> : null}
              </li>
            ))}
          </ul>
        )}
        {canWrite ? <div className="mt-4"><ApiKeyForm /></div> : <p className="mt-4 text-sm text-muted">{user.isDemo ? "The demo workspace cannot mint keys." : "Viewers cannot mint keys."}</p>}
      </section>
      <section>
        <h2 className="font-serif text-2xl">Webhooks</h2>
        <p className="mt-2 text-sm text-muted">Fired after a completed scan. The payload is the score, the URL, and finding id, severity, and title. Prompt text is never included.</p>
        {hooks.length === 0 ? <p className="mt-3 text-sm text-muted">No webhooks yet.</p> : (
          <ul className="mt-3 divide-y divide-line border border-line text-sm">
            {hooks.map((hook) => (
              <li key={hook.id} className="px-4 py-3">
                <p className="break-all">{hook.url}</p>
                <p className="text-xs text-muted">{hook.enabled ? "Enabled" : "Disabled"}{hook.lastStatus != null ? ` · last HTTP ${hook.lastStatus}` : ""}{hook.lastError ? ` · ${hook.lastError}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
        {canWrite ? <div className="mt-4"><WebhookForm /></div> : null}
      </section>
    </div>
  );
}
