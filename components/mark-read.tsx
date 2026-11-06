"use client";

import { useRouter } from "next/navigation";

export function MarkReadButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-brass"
      onClick={async () => {
        await fetch("/api/app/notifications/read", { method: "POST" });
        router.refresh();
      }}
    >
      Mark all read
    </button>
  );
}
