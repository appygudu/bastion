export function Mark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path fill="currentColor" d="M4 6h24v4H4zM4 6h4v20H4zM24 6h4v20h-4zM14 16h4v10h-4z" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 text-paper">
      <Mark className="h-5 w-5 text-brass" />
      <span className="font-serif text-xl tracking-tight">Bastion</span>
      {compact ? null : <span className="hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:inline">Flyhigh</span>}
    </span>
  );
}
