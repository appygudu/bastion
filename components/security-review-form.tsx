"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Area, Field } from "@/components/ui/field";

export function SecurityReviewForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  if (done) return <p className="border border-line bg-ink-2 p-4 text-sm text-sage">Saved. An operator can read it in the admin view. That is not a commitment to a review, a contract, or a certification.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/security-review", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: form.get("name"),
            email: form.get("email"),
            company: form.get("company"),
            message: form.get("message"),
          }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The request was not saved.");
          return;
        }
        setDone(true);
      }}
    >
      <label className="block text-sm text-paper">Name
        <Field name="name" required className="mt-1" />
      </label>
      <label className="block text-sm text-paper">Work email
        <Field name="email" type="email" required className="mt-1" />
      </label>
      <label className="block text-sm text-paper">Company
        <Field name="company" required className="mt-1" />
      </label>
      <label className="block text-sm text-paper">What you want reviewed
        <Area name="message" required className="mt-1 min-h-28 font-sans text-sm" />
      </label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Request a security review"}</Button>
    </form>
  );
}
