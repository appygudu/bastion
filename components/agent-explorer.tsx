"use client";

import { useMemo, useState } from "react";
import { CopyButton } from "@/components/copy-button";
import { useToast } from "@/components/toast";
import { spreadsheetCell } from "@/lib/csv";
import { cn } from "@/lib/cn";

export interface AgentRow {
  id: string;
  agentName: string;
  tool: string;
  outcome: string;
  hostname: string;
  isDemo: boolean;
  promptHash: string;
  decision?: string;
  findings: { id: string; severity: string; title: string; owaspLlm: string; evidence: string }[];
}

export function AgentExplorer({ events }: { events: AgentRow[] }) {
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("all");
  const [open, setOpen] = useState<string | null>(events.find((event) => event.findings.length)?.id ?? null);
  const toast = useToast();

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return events.filter((event) => {
      if (severity !== "all" && !event.findings.some((finding) => finding.severity === severity) && !(severity === "clear" && event.findings.length === 0)) return false;
      if (!needle) return true;
      return `${event.agentName} ${event.tool} ${event.outcome} ${event.decision ?? ""} ${event.findings.map((finding) => finding.title).join(" ")}`.toLowerCase().includes(needle);
    });
  }, [events, query, severity]);

  function exportJson() {
    const blob = new Blob([JSON.stringify(visible, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bastion-agent-log.json";
    link.click();
    URL.revokeObjectURL(url);
    toast("Exported the visible tool calls as JSON.");
  }

  function exportCsv() {
    const header = ["id", "agent", "tool", "outcome", "decision", "hostname", "promptHash", "findings"].map(spreadsheetCell).join(",");
    const lines = visible.map((event) => [
      event.id,
      event.agentName,
      event.tool,
      event.outcome,
      event.decision ?? "",
      event.hostname,
      event.promptHash,
      event.findings.map((finding) => finding.id).join("|"),
    ].map(spreadsheetCell).join(","));
    const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bastion-agent-log.csv";
    link.click();
    URL.revokeObjectURL(url);
    toast("Exported the visible tool calls as CSV.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search agent, tool, or finding"
          aria-label="Search agent log"
          className="h-10 min-w-0 flex-1 rounded-sm border border-line bg-ink px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
        />
        <button type="button" onClick={exportJson} className="h-10 rounded-sm border border-line px-3 text-sm text-brass">Export JSON</button>
        <button type="button" onClick={exportCsv} className="h-10 rounded-sm border border-line px-3 text-sm text-brass">Export CSV</button>
      </div>
      <div className="flex flex-wrap gap-2" role="toolbar" aria-label="Finding severity">
        {["all", "critical", "high", "medium", "clear"].map((item) => (
          <button
            key={item}
            type="button"
            aria-pressed={severity === item}
            onClick={() => setSeverity(item)}
            className={cn("rounded-full border px-3 py-1 text-xs capitalize", severity === item ? "border-brass text-brass" : "border-line text-muted")}
          >
            {item === "clear" ? "No indicators" : item}
          </button>
        ))}
      </div>
      {visible.length === 0 ? <p className="border border-dashed border-line p-6 text-sm text-muted">No tool calls match this filter.</p> : (
        <ul className="space-y-3">
          {visible.map((event) => {
            const expanded = open === event.id;
            return (
              <li key={event.id} className="rounded-md border border-line">
                <button type="button" className="flex w-full flex-wrap items-start justify-between gap-2 px-4 py-3 text-left" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : event.id)}>
                  <span>
                    <span className="block text-base text-paper">{event.agentName} · {event.tool}</span>
                    <span className="font-mono text-[11px] text-muted">prompt sha256 {event.promptHash.slice(0, 16)}…</span>
                  </span>
                  <span className="text-xs text-muted">{event.decision ?? "flag"} · {event.outcome} · {event.hostname}{event.isDemo ? " · demo" : ""}</span>
                </button>
                {expanded ? (
                  <div className="border-t border-line px-4 py-3 text-sm">
                    {event.findings.length === 0 ? <p className="text-sage">No indicators. The prompt text was not stored.</p> : (
                      <ul className="space-y-3">
                        {event.findings.map((finding) => {
                          const step = remediationFor(finding.id, finding.owaspLlm);
                          return (
                          <li key={finding.id}>
                            <span className={cn("text-[11px] uppercase", `sev-${finding.severity}`)}>{finding.severity}</span>
                            <span className="ml-2">{finding.title}</span>
                            <p className="text-xs text-muted">{finding.owaspLlm}. {finding.evidence}</p>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-paper">{step}</p>
                              <CopyButton text={step} label="Copy step" />
                            </div>
                          </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function remediationFor(id: string, owasp: string): string {
  if (id.startsWith("llm-ignore") || id.startsWith("llm-disregard") || id.startsWith("llm-role") || owasp.startsWith("LLM01")) {
    return "Treat the call as untrusted. Hold the tool until a person reviews it, and keep system instructions out of the user channel.";
  }
  if (id === "llm-reveal-prompt" || owasp.startsWith("LLM07")) {
    return "Do not return the system prompt. Respond with a refusal and keep the hidden instructions out of the tool result.";
  }
  if (owasp.startsWith("LLM02")) {
    return "Drop the tool result, rotate any secret that may have been present, and leave the prompt text out of the log.";
  }
  if (owasp.startsWith("LLM06")) {
    return "Require a person's approval before a shell, exec, or SQL tool is allowed to succeed.";
  }
  if (owasp.startsWith("LLM10")) {
    return "Cap the input length before the model call, and reject payloads above the limit you set.";
  }
  return "Review the tool result with the owner of the agent. The prompt text was not stored.";
}
