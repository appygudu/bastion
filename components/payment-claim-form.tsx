"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function PaymentClaimForm({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  if (disabled) return <p className="text-sm text-muted">A claim is already waiting for the operator.</p>;
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/billing/claim", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            transactionId: form.get("transactionId"),
            payerEmail: form.get("payerEmail"),
            note: form.get("note"),
          }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The claim was not saved.");
          return;
        }
        setDone(true);
        router.refresh();
      }}
    >
      <label className="block text-sm">PayPal transaction id
        <Field name="transactionId" required autoComplete="off" className="mt-1" placeholder="8AB12345CD678901E" />
      </label>
      <label className="block text-sm">Payer email
        <Field name="payerEmail" type="email" required autoComplete="email" className="mt-1" />
      </label>
      <label className="block text-sm">Note, optional
        <Field name="note" className="mt-1" />
      </label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      {done ? <p className="text-sm text-sage">Saved. The plan stays Free until the operator approves it. There is no PayPal webhook.</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Submit claim"}</Button>
    </form>
  );
}
