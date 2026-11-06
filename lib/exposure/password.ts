function rotl(value: number, shift: number): number {
  return ((value << shift) | (value >>> (32 - shift))) >>> 0;
}

export function sha1HexSync(message: string): string {
  const bytes = Array.from(new TextEncoder().encode(message));
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  const high = Math.floor(bitLength / 0x100000000);
  const low = bitLength >>> 0;
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
  for (let shift = 24; shift >= 0; shift -= 8) bytes.push((low >>> shift) & 0xff);
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const words = new Array<number>(80);
  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let index = 0; index < 16; index += 1) {
      const start = offset + index * 4;
      words[index] = ((bytes[start] << 24) | (bytes[start + 1] << 16) | (bytes[start + 2] << 8) | bytes[start + 3]) >>> 0;
    }
    for (let index = 16; index < 80; index += 1) {
      words[index] = rotl(words[index - 3] ^ words[index - 8] ^ words[index - 14] ^ words[index - 16], 1);
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let index = 0; index < 80; index += 1) {
      let f = 0;
      let k = 0;
      if (index < 20) {
        f = ((b & c) | (~b & d)) >>> 0;
        k = 0x5a827999;
      } else if (index < 40) {
        f = (b ^ c ^ d) >>> 0;
        k = 0x6ed9eba1;
      } else if (index < 60) {
        f = ((b & c) | (b & d) | (c & d)) >>> 0;
        k = 0x8f1bbcdc;
      } else {
        f = (b ^ c ^ d) >>> 0;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + words[index]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((part) => part.toString(16).padStart(8, "0")).join("");
}

export function rangePrefixFromBody(body: unknown): string | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== 1 || keys[0] !== "prefix" || typeof record.prefix !== "string") return null;
  const prefix = record.prefix.trim().toUpperCase();
  return /^[0-9A-F]{5}$/.test(prefix) ? prefix : null;
}

export function pwnedRangeParts(sha1Hex: string): { prefix: string; suffix: string } {
  const normalized = sha1Hex.trim().toUpperCase();
  if (!/^[0-9A-F]{40}$/.test(normalized)) throw new Error("Expected a SHA-1 hex digest.");
  return { prefix: normalized.slice(0, 5), suffix: normalized.slice(5) };
}

export function pwnedRangeUrl(prefix: string): string {
  const normalized = prefix.trim().toUpperCase();
  if (!/^[0-9A-F]{5}$/.test(normalized)) throw new Error("Range prefix must be 5 hex characters.");
  return `https://api.pwnedpasswords.com/range/${normalized}`;
}

export function looksLikePwnedRange(body: string): boolean {
  return /^[0-9A-F]{35}:\d+/im.test(body);
}

export function countInRange(body: string, suffix: string): number {
  const target = suffix.trim().toUpperCase();
  if (!/^[0-9A-F]{35}$/.test(target)) return 0;
  for (const line of body.split(/\r?\n/)) {
    for (const pair of line.trim().split(/\s+/)) {
      const separator = pair.indexOf(":");
      if (separator <= 0) continue;
      const hash = pair.slice(0, separator).trim().toUpperCase();
      if (hash !== target) continue;
      const parsed = Number(pair.slice(separator + 1));
      return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
  }
  return 0;
}

export function strengthTips(password: string, pwnedCount: number | null): string[] {
  const tips = [
    "Use a unique password for this account, kept in a password manager.",
    "Turn on a passkey or an authenticator app where the service allows it.",
  ];
  if (password.length > 0 && password.length < 12) tips.unshift("Use at least 12 characters. A short string is easy to guess even when it is not in a breach corpus.");
  if (password.length > 0 && (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password))) {
    tips.unshift("Mix letter case and a number, or use a passphrase of several unrelated words.");
  }
  if (pwnedCount && pwnedCount > 0) tips.unshift("This password appeared in the Pwned Passwords corpus. Stop using it, including anywhere it was reused.");
  return tips;
}
