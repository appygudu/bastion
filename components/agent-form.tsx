"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Area, Field } from "@/components/ui/field";

export function AgentForm({ siteId, readOnly = false }: { siteId: string; readOnly?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (readOnly) {
    return <p className="rounded-md border border-line bg-ink-2 p-5 text-sm text-muted">The demo workspace cannot append tool calls. The log below is the seeded fixture.</p>;
  }
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/agent-events", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            siteId,
            agentName: form.get("agentName"),
            tool: form.get("tool"),
            outcome: form.get("outcome"),
            content: form.get("content"),
          }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "Could not record the call.");
          return;
        }
        (event.target as HTMLFormElement).reset();
        router.refresh();
      }}
    >
      <h2 className="font-serif text-2xl">Record a tool call</h2>
      <p className="text-xs text-muted">The text is hashed and discarded. Findings stay. Do not paste live customer secrets if you can avoid it; the rules are there to catch them, and the value is not stored.</p>
      <label className="block text-sm">Agent name<Field name="agentName" required placeholder="support-agent" className="mt-1" /></label>
      <label className="block text-sm">Tool<Field name="tool" required placeholder="lookup_order" className="mt-1" /></label>
      <label className="block text-sm">Outcome<Field name="outcome" required placeholder="success or blocked" className="mt-1" /></label>
      <label className="block text-sm">Context to evaluate<Area name="content" required placeholder="Tool context to evaluate" className="mt-1 min-h-28" /></label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Recording…" : "Log tool call"}</Button>
    </form>
  );
}
