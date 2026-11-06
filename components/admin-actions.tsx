"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ClaimReviewForm({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="mt-2 flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/claims", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, decision: form.get("decision"), note: form.get("note") }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The review was not saved.");
          return;
        }
        router.refresh();
      }}
    >
      <select name="decision" aria-label="Claim decision" className="h-9 rounded-sm border border-line bg-ink px-2 text-xs">
        <option value="approved">Approve</option>
        <option value="rejected">Reject</option>
      </select>
      <input name="note" aria-label="Review note" placeholder="Note" className="h-9 rounded-sm border border-line bg-ink px-2 text-xs" />
      <button type="submit" disabled={pending} className="text-xs text-brass">{pending ? "Saving…" : "Save"}</button>
      {error ? <span className="text-xs text-clay" role="alert">{error}</span> : null}
    </form>
  );
}

export function ReviewStatusForm({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/admin/reviews", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id, status: form.get("status") }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Could not update the request.");
          return;
        }
        router.refresh();
      }}
    >
      <select name="status" aria-label="Request status" defaultValue={status} className="h-9 rounded-sm border border-line bg-ink px-2 text-xs">
        <option value="new">New</option>
        <option value="contacted">Contacted</option>
        <option value="closed">Closed</option>
      </select>
      <button type="submit" className="text-xs text-brass">Update</button>
      {error ? <span className="text-xs text-clay" role="alert">{error}</span> : null}
    </form>
  );
}
