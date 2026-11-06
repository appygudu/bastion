"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { Button } from "@/components/ui/button";

export function CopyButton({ text, label = "Copy fix" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <Button
      type="button"
      variant="quiet"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          toast("Copied to the clipboard.");
          setTimeout(() => setCopied(false), 1400);
        } catch {
          toast("Clipboard access was blocked. Select the text and copy it manually.");
        }
      }}
    >
      {copied ? "Copied" : label}
    </Button>
  );
}
