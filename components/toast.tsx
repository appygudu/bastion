"use client";

import { createContext, useContext, useRef, useState } from "react";

const ToastContext = createContext<(message: string) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: string) {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2400);
  }

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[80] max-w-sm px-4" aria-live="polite">
        {message ? (
          <p className="pointer-events-auto rounded-md border border-line bg-ink-2 px-3 py-2 text-sm text-paper shadow-[var(--shadow)]">
            {message}
          </p>
        ) : null}
      </div>
    </ToastContext.Provider>
  );
}
