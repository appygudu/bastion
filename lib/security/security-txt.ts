export function securityTxt(origin: string, contact: string | null, now = new Date()): string {
  const expires = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const lines = [
    contact ? `Contact: mailto:${contact}` : null,
    `Contact: ${origin}/security`,
    `Expires: ${expires.toISOString()}`,
    "Preferred-Languages: en",
    `Canonical: ${origin}/.well-known/security.txt`,
    `Policy: ${origin}/security`,
  ].filter((line): line is string => Boolean(line));
  return `${lines.join("\n")}\n`;
}
