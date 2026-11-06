"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

type Decision = "allow" | "flag" | "deny";
type Row = { name: string; decision: Decision };

export function GuardrailForm({
  initial,
}: {
  initial: { tools: Row[]; domains: Row[]; onInjection: "flag" | "deny"; onRiskyTool: "flag" | "deny" };
}) {
  const router = useRouter();
  const [tools, setTools] = useState<Row[]>(initial.tools);
  const [domains, setDomains] = useState<Row[]>(initial.domains);
  const [onInjection, setOnInjection] = useState(initial.onInjection);
  const [onRiskyTool, setOnRiskyTool] = useState(initial.onRiskyTool);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-4 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const response = await fetch("/api/app/guardrails", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tools, domains, onInjection, onRiskyTool }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The policy was not saved.");
          return;
        }
        router.refresh();
      }}
    >
      <p className="text-sm text-muted">A matching tool or hostname returns allow, flag, or deny with the event. Prompt-injection indicators and a completed high-impact tool can be flagged or denied. The caller has to honor deny. Bastion does not sit in the agent process.</p>
      <RuleList label="Tool" rows={tools} onChange={setTools} placeholder="shell" />
      <RuleList label="Domain" rows={domains} onChange={setDomains} placeholder="example.com" />
      <label className="block text-sm">Prompt-injection indicators
        <select value={onInjection} onChange={(event) => setOnInjection(event.target.value as "flag" | "deny")} className="mt-1 h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm">
          <option value="flag">Flag</option>
          <option value="deny">Deny</option>
        </select>
      </label>
      <label className="block text-sm">Completed high-impact tool
        <select value={onRiskyTool} onChange={(event) => setOnRiskyTool(event.target.value as "flag" | "deny")} className="mt-1 h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm">
          <option value="flag">Flag</option>
          <option value="deny">Deny</option>
        </select>
      </label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save guardrails"}</Button>
    </form>
  );
}

function RuleList({ label, rows, onChange, placeholder }: { label: string; rows: Row[]; onChange: (rows: Row[]) => void; placeholder: string }) {
  const [name, setName] = useState("");
  const [decision, setDecision] = useState<Decision>("deny");
  return (
    <fieldset>
      <legend className="text-sm">{label} rules</legend>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.length === 0 ? <li className="text-muted">None yet.</li> : null}
        {rows.map((row) => (
          <li key={`${row.name}-${row.decision}`} className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs">{row.name} · {row.decision}</span>
            <button type="button" className="text-xs text-brass" onClick={() => onChange(rows.filter((item) => item.name !== row.name))}>Remove</button>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex flex-wrap gap-2">
        <Field value={name} onChange={(event) => setName(event.target.value)} placeholder={placeholder} aria-label={`${label} name`} className="max-w-xs" />
        <select value={decision} aria-label={`${label} decision`} onChange={(event) => setDecision(event.target.value as Decision)} className="h-11 rounded-sm border border-line bg-ink px-2 text-sm">
          <option value="allow">Allow</option>
          <option value="flag">Flag</option>
          <option value="deny">Deny</option>
        </select>
        <button
          type="button"
          className="h-11 rounded-sm border border-line px-3 text-sm"
          onClick={() => {
            const trimmed = name.trim().toLowerCase();
            if (!trimmed) return;
            onChange([...rows.filter((row) => row.name !== trimmed), { name: trimmed, decision }]);
            setName("");
          }}
        >
          Add
        </button>
      </div>
    </fieldset>
  );
}
