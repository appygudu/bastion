import { AgentExplorer, type AgentRow } from "@/components/agent-explorer";
import { AgentForm } from "@/components/agent-form";
import { GuardrailForm } from "@/components/guardrail-form";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { DEFAULT_RULES, parseGuardrailRules, type GuardrailDecision } from "@/lib/guardrails/policy";

export const metadata = { title: "Agents" };

export default async function AgentsPage() {
  const user = await requireUser();
  const sites = await prisma.site.findMany({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
  const events = await prisma.agentEvent.findMany({ where: { site: { userId: user.id } }, orderBy: { occurredAt: "desc" }, take: 40, include: { site: true } });
  const stored = await prisma.guardrailPolicy.findUnique({ where: { userId: user.id } });
  let rules = DEFAULT_RULES;
  if (stored) {
    try {
      rules = parseGuardrailRules(JSON.parse(stored.rulesJson)) ?? DEFAULT_RULES;
    } catch {
      rules = DEFAULT_RULES;
    }
  }
  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Agent guardrails</p>
        <h1 className="mt-2 font-serif text-4xl">Tool-call log</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted">Indicator rules, not a model. A match is a reason to look, mapped to the OWASP Top 10 for LLM Applications 2025. Prompt text is not retained. The decision is allow, flag, or deny. The caller enforces deny.</p>
      </div>
      {user.isDemo || user.role === "viewer" ? <p className="text-sm text-muted">{user.isDemo ? "The demo uses the default guardrail policy and cannot change it." : "Viewers can read the log and cannot change the policy."}</p> : (
        <GuardrailForm initial={{
          tools: Object.entries(rules.tools).map(([name, decision]) => ({ name, decision: decision as GuardrailDecision })),
          domains: Object.entries(rules.domains).map(([name, decision]) => ({ name, decision: decision as GuardrailDecision })),
          onInjection: rules.onInjection,
          onRiskyTool: rules.onRiskyTool,
        }} />
      )}
      {user.isDemo ? <AgentForm siteId={sites[0]?.id ?? "demo"} readOnly /> : sites[0] ? <AgentForm siteId={sites[0].id} /> : <p className="rounded-md border border-dashed border-line p-4 text-sm text-muted">Create a property in Settings before logging tool calls.</p>}
      {events.length === 0 ? <p className="rounded-md border border-dashed border-line p-6 text-sm text-muted">No tool calls yet. A logged call stores the hash and the indicators, not the prompt.</p> : (
        <AgentExplorer events={events.map((event): AgentRow => ({
          id: event.id,
          agentName: event.agentName,
          tool: event.tool,
          outcome: event.outcome,
          hostname: event.site.hostname,
          isDemo: event.isDemo,
          promptHash: event.promptHash,
          decision: event.decision,
          findings: parseFindings(event.findingsJson),
        }))} />
      )}
    </div>
  );
}

function parseFindings(raw: string): AgentRow["findings"] {
  try {
    const value = JSON.parse(raw) as unknown;
    if (!Array.isArray(value)) return [];
    return value as AgentRow["findings"];
  } catch {
    return [];
  }
}
