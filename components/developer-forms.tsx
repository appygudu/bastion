"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function ApiKeyForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const scopes = ["scans:read", "scans:write"].filter((scope) => form.get(scope) === "on");
        const response = await fetch("/api/app/api-keys", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: form.get("name"), scopes }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The key was not created.");
          return;
        }
        setToken(data.token);
        router.refresh();
      }}
    >
      <label className="block text-sm">Name
        <Field name="name" required className="mt-1" />
      </label>
      <fieldset className="text-sm">
        <legend>Scopes</legend>
        <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="scans:read" defaultChecked /> scans:read</label>
        <label className="mt-2 flex items-center gap-2"><input type="checkbox" name="scans:write" /> scans:write</label>
      </fieldset>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      {token ? <p className="break-all font-mono text-xs text-paper">Copy this key now. It is stored only as a hash. {token}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create API key"}</Button>
    </form>
  );
}

export function RevokeKeyButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/app/api-keys/revoke", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Could not revoke the key.");
          return;
        }
        router.refresh();
      }}
    >
      <button type="submit" className="text-xs text-brass">Revoke</button>
      {error ? <span className="ml-2 text-xs text-clay" role="alert">{error}</span> : null}
    </form>
  );
}

export function WebhookForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/webhooks", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: form.get("url") }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The webhook was not saved.");
          return;
        }
        setSecret(data.secret);
        router.refresh();
      }}
    >
      <label className="block text-sm">HTTPS endpoint
        <Field name="url" type="url" required placeholder="https://example.com/bastion" className="mt-1" />
      </label>
      <p className="text-xs text-muted">Bastion posts scan.completed and signs the body with HMAC-SHA256 in X-Bastion-Signature. Redirects are not followed. Private addresses are refused. The TCP connection is not pinned the way a scan is.</p>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      {secret ? <p className="break-all font-mono text-xs text-paper">Signing secret, shown once: {secret}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Add webhook"}</Button>
    </form>
  );
}
