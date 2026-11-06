import { cn } from "@/lib/cn";

export function Field({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full rounded-sm border border-line bg-ink px-3 text-sm text-paper placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
        className,
      )}
      {...props}
    />
  );
}

export function Area({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "min-h-48 w-full rounded-sm border border-line bg-ink px-3 py-2 font-mono text-xs text-paper placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass",
        className,
      )}
      {...props}
    />
  );
}
