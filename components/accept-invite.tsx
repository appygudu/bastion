"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        const response = await fetch("/api/app/invitations/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The invitation was not accepted.");
          return;
        }
        router.push("/app");
        router.refresh();
      }}
    >
      {error ? <p className="mb-3 text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Joining…" : "Accept invitation"}</Button>
    </form>
  );
}
