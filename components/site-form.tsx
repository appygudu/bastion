"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { CopyButton } from "@/components/copy-button";

export function SiteForm({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (readOnly) {
    return <p className="rounded-md border border-line bg-ink-2 p-5 text-sm text-muted">The demo workspace cannot add a property or mint an ingest key.</p>;
  }
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/sites", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), hostname: form.get("hostname") }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "Could not create the property.");
          return;
        }
        setKey(data.ingestKey);
        router.refresh();
      }}
    >
      <h2 className="font-serif text-2xl">Add a property</h2>
      <label className="block text-sm">Name<Field name="name" required placeholder="Marketing site" autoComplete="organization" className="mt-1" /></label>
      <label className="block text-sm">Hostname<Field name="hostname" required placeholder="www.example.com" autoComplete="url" className="mt-1" /></label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create property"}</Button>
      {key ? (
        <div className="border border-brass/50 bg-brass/10 p-3 text-sm">
          <p>Ingest key, shown once. Store it in the server that will send logs. Do not put a production key in a public page.</p>
          <p className="mt-2 break-all font-mono text-xs">{key}</p>
          <div className="mt-2"><CopyButton text={key} label="Copy key" /></div>
        </div>
      ) : null}
    </form>
  );
}
