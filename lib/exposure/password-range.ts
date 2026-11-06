import { pwnedRangeUrl } from "@/lib/exposure/password";
import { assertOutboundUrl } from "@/lib/security/outbound";

export async function fetchPwnedRange(prefix: string, fetchImpl: typeof fetch = fetch): Promise<string> {
  const url = pwnedRangeUrl(prefix);
  assertOutboundUrl(url);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      headers: {
        "Add-Padding": "true",
        "user-agent": "Bastion/0.1 (k-anonymity password range)",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "error",
    });
  } catch {
    throw new Error("The Pwned Passwords range API could not be reached.");
  }
  if (response.url) assertOutboundUrl(response.url);
  if (!response.ok) throw new Error("The Pwned Passwords range API could not be reached.");
  const text = await response.text();
  if (text.length > 2_000_000) throw new Error("The Pwned Passwords range API could not be reached.");
  return text;
}
