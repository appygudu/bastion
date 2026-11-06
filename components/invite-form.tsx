"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";

export function InviteForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  return (
    <form
      className="space-y-3 border border-line p-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setPending(true);
        setError(null);
        setLink(null);
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/invitations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: form.get("email"), role: form.get("role") }),
        });
        const data = await response.json();
        setPending(false);
        if (!response.ok) {
          setError(data.error ?? "The invitation was not created.");
          return;
        }
        setLink(`${window.location.origin}/invite/${data.token}`);
        router.refresh();
      }}
    >
      <label className="block text-sm">Email
        <Field name="email" type="email" required className="mt-1" />
      </label>
      <label className="block text-sm">Role
        <select name="role" className="mt-1 h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm" defaultValue="viewer">
          <option value="viewer">Viewer</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      {error ? <p className="text-sm text-clay" role="alert">{error}</p> : null}
      {link ? <p className="break-all font-mono text-xs text-paper">Shown once. Send this link: {link}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Creating…" : "Create invitation"}</Button>
    </form>
  );
}

export function WorkspaceSwitch({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const response = await fetch("/api/app/workspace", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ workspaceId: id }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Could not switch workspace.");
          return;
        }
        router.push("/app");
        router.refresh();
      }}
    >
      <span>{label}</span>
      <button type="submit" className="text-xs text-brass">Open</button>
      {error ? <span className="text-xs text-clay" role="alert">{error}</span> : null}
    </form>
  );
}

export function MemberRoleForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const response = await fetch("/api/app/members", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ userId, role: form.get("role") }),
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.error ?? "Could not update the member.");
          return;
        }
        setError(null);
        router.refresh();
      }}
    >
      <select name="role" aria-label="Change role" className="h-9 rounded-sm border border-line bg-ink px-2 text-xs" defaultValue="viewer">
        <option value="viewer">Viewer</option>
        <option value="admin">Admin</option>
        <option value="remove">Remove</option>
      </select>
      <button type="submit" className="text-xs text-brass">Apply</button>
      {error ? <span className="text-xs text-clay" role="alert">{error}</span> : null}
    </form>
  );
}
