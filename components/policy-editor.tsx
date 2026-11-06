"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { renderAiTxt, renderMiddleware, renderRobots, type PolicyRule } from "@/lib/bots/policy";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

export function PolicyEditor({ siteId, host, initial, readOnly = false }: { siteId: string; host: string; initial: PolicyRule[]; readOnly?: boolean }) {
  const router = useRouter();
  const [rules, setRules] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const robots = useMemo(() => renderRobots(rules), [rules]);
  const ai = useMemo(() => renderAiTxt(rules, host), [rules, host]);
  const middleware = useMemo(() => renderMiddleware(rules), [rules]);

  function update(agent: string, key: "access" | "training" | "scraping", value: "allow" | "deny") {
    setRules((current) => current.map((rule) => (rule.agent === agent ? { ...rule, [key]: value } : rule)));
  }

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-ink-2 text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Agent</th>
              <th className="px-3 py-2 font-medium">Access</th>
              <th className="px-3 py-2 font-medium">Training</th>
              <th className="px-3 py-2 font-medium">Scraping</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.agent} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">{rule.agent}</td>
                {(["access", "training", "scraping"] as const).map((key) => (
                  <td key={key} className="px-3 py-2">
                    <select
                      aria-label={`${rule.agent} ${key}`}
                      value={rule[key]}
                      disabled={readOnly}
                      onChange={(event) => update(rule.agent, key, event.target.value as "allow" | "deny")}
                      className="bg-ink text-paper focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
                    >
                      <option value="allow">allow</option>
                      <option value="deny">deny</option>
                    </select>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {readOnly ? <p className="text-sm text-muted">The demo workspace cannot save a policy. The files below are generated from the seeded rules and can be copied.</p> : null}
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button
        type="button"
        disabled={pending || readOnly}
        onClick={async () => {
          setPending(true);
          setError(null);
          const response = await fetch("/api/app/policies", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ siteId, rules }),
          });
          const data = await response.json();
          setPending(false);
          if (!response.ok) setError(data.error ?? "Could not save.");
          else router.refresh();
        }}
      >
        {pending ? "Saving…" : "Save policy"}
      </Button>
      <Artifact title="robots.txt" body={robots} note="A preference file. It does not enforce access." />
      <Artifact title="ai.txt" body={ai} note="Follows an informational Internet-Draft, not a published standard." />
      <Artifact title="Express middleware" body={middleware} note="Deploy this on a process you operate if you want the deny list enforced." />
    </div>
  );
}

function Artifact({ title, body, note }: { title: string; body: string; note: string }) {
  return (
    <section className="border border-line">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <div>
          <h3 className="text-sm">{title}</h3>
          <p className="text-xs text-muted">{note}</p>
        </div>
        <CopyButton text={body} label="Copy" />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs text-muted">{body}</pre>
    </section>
  );
}
