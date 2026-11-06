"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { safeNext } from "@/lib/auth/next-path";

export function AuthForm({ mode, nextPath = "/app" }: { mode: "login" | "signup"; nextPath?: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    const response = await fetch(mode === "login" ? "/api/auth/login" : "/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    setPending(false);
    if (!response.ok) {
      setError(data.error ?? "Request failed.");
      return;
    }
    const destination = safeNext(nextPath);
    router.push(destination);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === "signup" ? (
        <>
          <label className="block text-sm">Name<Field name="name" required minLength={2} className="mt-1" /></label>
          <label className="block text-sm">Organization<Field name="orgName" required minLength={2} className="mt-1" /></label>
        </>
      ) : null}
      <label className="block text-sm">Work email<Field name="email" type="email" required autoComplete="username" className="mt-1" /></label>
      <label className="block text-sm">Password<Field name="password" type="password" required minLength={10} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1" /></label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Working…" : mode === "login" ? "Sign in" : "Create workspace"}</Button>
    </form>
  );
}
