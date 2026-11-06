"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function RescanSchedule({ urls }: { urls: string[] }) {
  const router = useRouter();
  const [url, setUrl] = useState(urls[0] ?? "");
  const [attested, setAttested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  if (urls.length === 0) return <p className="text-sm text-muted">A weekly re-scan can be saved after this workspace completes a passive assessment of that host.</p>;
  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const response = await fetch("/api/app/schedules", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url, attested }),
    });
    const data = await response.json().catch(() => null);
    setPending(false);
    if (!response.ok) {
      setError(data?.error ?? "The schedule was not saved.");
      return;
    }
    setAttested(false);
    router.refresh();
  }
  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-md border border-line bg-ink-2 p-4">
      <label className="block text-sm">
        Host already assessed
        <select value={url} onChange={(event) => setUrl(event.target.value)} className="mt-2 h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm text-paper">
          {urls.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label className="flex items-start gap-3 text-sm text-muted">
        <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1" />
        <span>I still own this host or I still have written authority to assess it.</span>
      </label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={!attested || pending}>{pending ? "Saving…" : "Save weekly re-scan"}</Button>
    </form>
  );
}
