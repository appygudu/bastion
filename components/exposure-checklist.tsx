"use client";

import { useState } from "react";
import { ENTERPRISE_ACTIONS, PERSONAL_ACTIONS } from "@/lib/exposure/actions";
import { cn } from "@/lib/cn";

export function ExposureChecklist({ emphasized = false }: { emphasized?: boolean }) {
  const [enterprise, setEnterprise] = useState(false);
  const actions = enterprise ? ENTERPRISE_ACTIONS : PERSONAL_ACTIONS;
  return (
    <section className={cn("rounded-md border border-line bg-ink-2 p-4 sm:p-5", emphasized && "border-brass/50")} aria-labelledby="exposure-actions-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="exposure-actions-title" className="font-serif text-2xl">What to do now</h2>
          <p className="mt-1 text-sm text-muted">
            {enterprise
              ? "For a security team responsible for the accounts and the hosts."
              : "For the person who owns the email address or the password."}
          </p>
        </div>
        <button
          type="button"
          aria-pressed={enterprise}
          onClick={() => setEnterprise((value) => !value)}
          className={cn("rounded-full border px-3 py-1 text-xs", enterprise ? "border-brass text-brass" : "border-line text-muted")}
        >
          {enterprise ? "Security team" : "Personal"}
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {actions.map((action, index) => (
          <li key={action.id} className="rounded-sm border border-line px-3 py-2">
            <p className="text-sm text-paper"><span className="text-muted">{index + 1}. </span>{action.title}</p>
            <p className="text-xs text-muted">{action.detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
