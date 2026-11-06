"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: "#090b10", color: "#f4f1ea", fontFamily: "Georgia, serif", padding: "4rem 1.5rem" }}>
        <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12 }}>Error</p>
        <h1 style={{ fontSize: 40, marginTop: 12 }}>Bastion hit an unexpected error.</h1>
        <button type="button" onClick={() => reset()} style={{ marginTop: 24 }}>Try again</button>
      </body>
    </html>
  );
}
