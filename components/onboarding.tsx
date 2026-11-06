"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE = "bastion-onboarding-dismissed";

export function Onboarding({ steps }: { steps: { id: string; label: string; detail: string; href: string; done: boolean }[] }) {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE) === "1");
  }, []);
  if (hidden) return null;
  const done = steps.filter((step) => step.done).length;
  return (
    <section className="rounded-md border border-line bg-ink-2 p-4" aria-labelledby="onboarding-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="onboarding-title" className="text-base text-paper">First-run checklist</h2>
          <p className="mt-1 text-sm text-muted">{done} of {steps.length} complete. These steps use the controls you already have. Nothing here scans a host by itself.</p>
        </div>
        <button
          type="button"
          className="text-xs text-muted underline"
          aria-label="Dismiss the first-run checklist"
          onClick={() => {
            localStorage.setItem(STORAGE, "1");
            setHidden(true);
          }}
        >
          Dismiss
        </button>
      </div>
      <ol className="mt-4 space-y-2">
        {steps.map((step, index) => (
          <li key={step.id} className="flex items-start gap-3 rounded-sm border border-line px-3 py-2">
            <span className={step.done ? "text-sage" : "text-muted"} aria-hidden="true">{step.done ? "✓" : index + 1}</span>
            <div>
              <Link href={step.href} className="text-sm text-paper hover:text-brass">{step.label}</Link>
              <p className="text-xs text-muted">{step.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
