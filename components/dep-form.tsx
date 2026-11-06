"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Area } from "@/components/ui/field";

const SAMPLE = `{
  "dependencies": {
    "lodash": "4.17.20",
    "express": "4.18.2"
  }
}`;

export function DepForm({ readOnly = false }: { readOnly?: boolean }) {
  const router = useRouter();
  const [kind, setKind] = useState<"package.json" | "requirements.txt">("package.json");
  const [manifest, setManifest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/app/dependencies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind, manifest }),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Review failed.");
      return;
    }
    router.refresh();
  }

  if (readOnly) {
    return <p className="rounded-md border border-line bg-ink-2 p-5 text-sm text-muted">The demo workspace cannot send a new manifest to OSV.dev. Existing reviews on this page, if any, are the seeded fixture.</p>;
  }
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex flex-wrap gap-2 text-sm">
        {(["package.json", "requirements.txt"] as const).map((option) => (
          <button key={option} type="button" onClick={() => setKind(option)} className={`rounded-sm border px-3 py-1 ${kind === option ? "border-brass text-brass" : "border-line text-muted"}`}>
            {option}
          </button>
        ))}
        <button type="button" className="text-brass underline" onClick={() => { setKind("package.json"); setManifest(SAMPLE); }}>
          Load sample manifest
        </button>
      </div>
      <label className="block text-sm">Manifest<Area value={manifest} onChange={(event) => setManifest(event.target.value)} placeholder={kind === "package.json" ? SAMPLE : "Django==4.2.1"} required className="mt-1" /></label>
      <p className="text-xs text-muted">The sample is not your code. OSV.dev is queried live. Results are whatever that database returns at request time.</p>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Querying OSV.dev…" : "Review dependencies"}</Button>
    </form>
  );
}
