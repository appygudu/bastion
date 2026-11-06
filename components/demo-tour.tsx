"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STEPS = [
  { title: "Exposure check", body: "Try an email, a domain, or a password. The password is hashed in the browser. Only a 5-character SHA-1 prefix leaves the machine.", href: "/exposure", label: "Open exposure" },
  { title: "Global attacks", body: "Cards come from public feeds. Each one keeps its source link and date. If a feed fails, the page says so.", href: "/threats", label: "Open global attacks" },
  { title: "Demo workspace", body: "Sign in as demo@bastion.example. The Northwind score is a labelled fixture. It is not a customer and not a live scan.", href: "/login", label: "Sign in to the demo" },
  { title: "Scanner", body: "The demo cannot scan a host. A real workspace can, after you attest that you operate it. Private and metadata addresses are refused.", href: "/app/scan", label: "Open the scanner" },
  { title: "Ledger and agents", body: "The demo ledger is seeded. Agent rows store a prompt hash and a guardrail decision, not the prompt.", href: "/app/agents", label: "Open the agent log" },
  { title: "What is not claimed", body: "No SOC 2, no customer logos, no SAML. OIDC, email, and the weekly job run only when the operator sets the matching environment variables. The status page shows which of those are configured.", href: "/pitch", label: "Read the readiness note" },
];

export function DemoTour() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const saved = Number(localStorage.getItem("bastion-tour") ?? "0");
    if (Number.isInteger(saved) && saved >= 0 && saved < STEPS.length) setStep(saved);
  }, []);
  function go(next: number) {
    const index = Math.max(0, Math.min(STEPS.length - 1, next));
    setStep(index);
    localStorage.setItem("bastion-tour", String(index));
  }
  const current = STEPS[step];
  return (
    <section className="border border-brass/40 bg-ink-2 p-5" aria-labelledby="tour-title">
      <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Walkthrough · step {step + 1} of {STEPS.length}</p>
      <h2 id="tour-title" className="mt-2 font-serif text-3xl text-paper">{current.title}</h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{current.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={current.href} className="rounded-sm bg-brass px-3 py-2 text-sm font-medium text-on-accent">{current.label}</Link>
        <button type="button" className="rounded-sm border border-line px-3 py-2 text-sm" onClick={() => go(step - 1)} disabled={step === 0}>Back</button>
        <button type="button" className="rounded-sm border border-line px-3 py-2 text-sm" onClick={() => go(step + 1)} disabled={step === STEPS.length - 1}>Next</button>
      </div>
    </section>
  );
}
