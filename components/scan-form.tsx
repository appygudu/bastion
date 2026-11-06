"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function ScanForm({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const url = String(new FormData(event.currentTarget).get("url") ?? "");
    const response = await fetch("/api/app/scans", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, attested }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Scan failed.");
      return;
    }
    router.push(`/app/scan/${data.id}`);
    router.refresh();
  }

  if (readOnly) {
    return (
      <p className="rounded-md border border-line bg-ink-2 p-5 text-sm text-muted">
        The demo workspace cannot send scan traffic. The Northwind result below is a labelled fixture. Create your own workspace to assess a host you own.
      </p>
    );
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4 border border-line bg-ink-2 p-5">
      <label className="block text-sm">
        URL you own or are authorized to assess
        <Field name="url" required type="url" placeholder="https://app.your-company.com" className="mt-2" />
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1" />
        <span>I own this host or I have written authority to assess it. Bastion will send a small number of passive, read-only requests. It will not attempt to exploit anything.</span>
      </label>
      <details className="text-sm text-muted">
        <summary className="cursor-pointer text-brass">What the scanner will and will not do</summary>
        <p className="mt-2 leading-6">
          Before it connects, Bastion refuses loopback, private, link-local, and cloud metadata addresses, and any DNS answer that includes one. Ports other than 80, 443, 8080, and 8443 are refused. Redirects are checked again. The scan does not log in, send an exploit payload, or store the body of a sensitive path.
        </p>
      </details>
      {error ? <p className="text-sm text-clay">{error}</p> : null}
      <Button type="submit" disabled={!attested || pending}>{pending ? "Running passive checks…" : "Run passive scan"}</Button>
      {pending ? <p className="text-xs text-muted">This can take up to half a minute. Sensitive-path bodies are not stored.</p> : null}
    </form>
  );
}
