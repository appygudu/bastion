import type { Analysis, Finding, Pass, ScanObservation, Severity } from "@/lib/types";
import { CSP_VALUE, headerSnippet, HSTS_VALUE, pathDenySnippet } from "./fixes";
import { PATH_CHECKS } from "./paths";

const AI_TOKENS = ["gptbot", "claudebot", "google-extended", "bytespider", "ccbot", "amazonbot"];

function headerValue(headers: ScanObservation["headers"], name: string): string | null {
  const value = headers[name.toLowerCase()];
  if (value == null) return null;
  const joined = Array.isArray(value) ? value.join(", ") : value;
  const trimmed = joined.trim();
  return trimmed.length ? trimmed : null;
}

function headerList(headers: ScanObservation["headers"], name: string): string[] {
  const value = headers[name.toLowerCase()];
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function isHtml(obs: ScanObservation): boolean {
  const type = headerValue(obs.headers, "content-type") ?? "";
  return type.includes("text/html") || type === "";
}

function cspDirective(csp: string, name: string): string | null {
  const part = csp
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.toLowerCase().startsWith(name.toLowerCase()));
  return part ?? null;
}

function push(findings: Finding[], finding: Finding) {
  findings.push(finding);
}

function addPass(passes: Pass[], pass: Pass) {
  passes.push(pass);
}

export function analyze(obs: ScanObservation): Analysis {
  const findings: Finding[] = [];
  const passes: Pass[] = [];
  const https = obs.finalUrl.startsWith("https://");
  const html = isHtml(obs);

  if (!https) {
    push(findings, {
      id: "transport-cleartext",
      title: "Page was served over cleartext HTTP",
      severity: "high",
      category: "Transport",
      owasp: ["A04:2025 Cryptographic Failures", "A02:2021 Cryptographic Failures"],
      nistCsf: ["PR.DS", "PR.PS"],
      evidence: `Final URL ${obs.finalUrl} used HTTP. Browsers will not honor HSTS on this response.`,
      fix: `Serve the site on HTTPS with a publicly trusted certificate, then redirect HTTP to HTTPS and set:\n\n${headerSnippet("Strict-Transport-Security", HSTS_VALUE)}`,
    });
  }

  if (obs.tls) {
    if (!obs.tls.authorized) {
      push(findings, {
        id: "tls-unverified",
        title: "TLS certificate did not verify",
        severity: "high",
        category: "Transport",
        owasp: ["A04:2025 Cryptographic Failures"],
        nistCsf: ["PR.DS"],
        evidence: obs.tls.authorizationError
          ? `Certificate verification failed: ${obs.tls.authorizationError}. Headers were read only after that failure was recorded.`
          : "Certificate verification failed. Headers were read only after that failure was recorded.",
        fix: "Install a certificate from a publicly trusted CA that matches the hostname, with a complete chain. Do not ask users to click through a warning.",
      });
    } else {
      addPass(passes, {
        id: "tls-verified",
        title: "TLS certificate verified",
        evidence: `${obs.tls.subject ?? "certificate"} issued by ${obs.tls.issuer ?? "an unknown issuer"}.`,
      });
    }
    if (obs.tls.protocol && !/^TLS[v ]?1\.[23]$/i.test(obs.tls.protocol)) {
      push(findings, {
        id: "tls-protocol",
        title: "Negotiated TLS protocol is obsolete",
        severity: "high",
        category: "Transport",
        owasp: ["A04:2025 Cryptographic Failures"],
        nistCsf: ["PR.DS"],
        evidence: `Negotiated protocol: ${obs.tls.protocol}.`,
        fix: "Disable TLS 1.0 and 1.1. Prefer TLS 1.3, with TLS 1.2 only if a client you must support cannot use 1.3.",
      });
    } else if (obs.tls.protocol) {
      addPass(passes, {
        id: "tls-modern",
        title: "Modern TLS protocol",
        evidence: `Negotiated ${obs.tls.protocol}${obs.tls.cipher ? ` with ${obs.tls.cipher}` : ""}.`,
      });
    }
    if (obs.tls.daysRemaining != null && obs.tls.daysRemaining < 0) {
      push(findings, {
        id: "tls-expired",
        title: "TLS certificate is expired",
        severity: "critical",
        category: "Transport",
        owasp: ["A04:2025 Cryptographic Failures"],
        nistCsf: ["PR.DS"],
        evidence: `Not after ${obs.tls.validTo}.`,
        fix: "Renew the certificate and automate renewal. Confirm the full chain is served.",
      });
    } else if (obs.tls.daysRemaining != null && obs.tls.daysRemaining < 14) {
      push(findings, {
        id: "tls-expiring",
        title: "TLS certificate expires within 14 days",
        severity: "high",
        category: "Transport",
        owasp: ["A04:2025 Cryptographic Failures"],
        nistCsf: ["PR.DS"],
        evidence: `${obs.tls.daysRemaining} days remaining (not after ${obs.tls.validTo}).`,
        fix: "Renew the certificate before it expires and confirm automated renewal is actually running.",
      });
    } else if (obs.tls.daysRemaining != null && obs.tls.daysRemaining < 45) {
      push(findings, {
        id: "tls-expiring-soon",
        title: "TLS certificate expires within 45 days",
        severity: "medium",
        category: "Transport",
        owasp: ["A04:2025 Cryptographic Failures"],
        nistCsf: ["PR.DS"],
        evidence: `${obs.tls.daysRemaining} days remaining (not after ${obs.tls.validTo}).`,
        fix: "Schedule renewal now. A certificate that expires on a weekend is a preventable outage.",
      });
    }
  }

  const csp = headerValue(obs.headers, "content-security-policy");
  if (!csp && html) {
    push(findings, {
      id: "hdr-csp",
      title: "Content-Security-Policy is missing",
      severity: "high",
      category: "Headers",
      owasp: ["A05:2025 Injection", "A03:2021 Injection", "A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: "The HTML response did not include Content-Security-Policy.",
      fix: `Start from the OWASP Secure Headers baseline and tighten it for your real origins. The preload directive is intentionally omitted.\n\n${headerSnippet("Content-Security-Policy", CSP_VALUE)}`,
    });
  } else if (csp) {
    const script = cspDirective(csp, "script-src") ?? cspDirective(csp, "default-src") ?? "";
    if (/'unsafe-inline'|'unsafe-eval'/i.test(script)) {
      push(findings, {
        id: "csp-unsafe",
        title: "Content-Security-Policy allows unsafe script sources",
        severity: "medium",
        category: "Headers",
        owasp: ["A05:2025 Injection", "A03:2021 Injection"],
        nistCsf: ["PR.PS"],
        evidence: `Policy: ${csp.slice(0, 280)}`,
        fix: "Remove 'unsafe-inline' and 'unsafe-eval' from script-src. Use nonces or hashes for scripts you control.",
      });
    } else {
      addPass(passes, { id: "hdr-csp", title: "Content-Security-Policy is present", evidence: csp.slice(0, 180) });
    }
  }

  const hsts = headerValue(obs.headers, "strict-transport-security");
  if (https && !hsts) {
    push(findings, {
      id: "hdr-hsts",
      title: "Strict-Transport-Security is missing",
      severity: "high",
      category: "Headers",
      owasp: ["A04:2025 Cryptographic Failures", "A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.DS"],
      evidence: "The HTTPS response did not include Strict-Transport-Security.",
      fix: `Set HSTS without preload until every subdomain is HTTPS-capable. OWASP's baseline is two years.\n\n${headerSnippet("Strict-Transport-Security", HSTS_VALUE)}`,
    });
  } else if (hsts) {
    const maxAge = Number(/max-age=(\d+)/i.exec(hsts)?.[1] ?? "0");
    if (maxAge < 15552000) {
      push(findings, {
        id: "hsts-short",
        title: "HSTS max-age is shorter than six months",
        severity: "low",
        category: "Headers",
        owasp: ["A02:2025 Security Misconfiguration"],
        nistCsf: ["PR.DS"],
        evidence: `Strict-Transport-Security: ${hsts}`,
        fix: headerSnippet("Strict-Transport-Security", HSTS_VALUE),
      });
    } else {
      addPass(passes, { id: "hdr-hsts", title: "HSTS is set", evidence: hsts });
    }
  }

  const xfo = headerValue(obs.headers, "x-frame-options");
  const frameAncestors = csp ? cspDirective(csp, "frame-ancestors") : null;
  if (html && !xfo && !frameAncestors) {
    push(findings, {
      id: "hdr-frame",
      title: "No clickjacking control on the HTML response",
      severity: "medium",
      category: "Headers",
      owasp: ["A01:2025 Broken Access Control", "A05:2021 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: "Neither Content-Security-Policy frame-ancestors nor X-Frame-Options was present.",
      fix: `Prefer CSP frame-ancestors. X-Frame-Options remains useful for older clients.\n\n${headerSnippet("Content-Security-Policy", "frame-ancestors 'none'")}\n${headerSnippet("X-Frame-Options", "DENY")}`,
    });
  } else if (xfo || frameAncestors) {
    addPass(passes, {
      id: "hdr-frame",
      title: "Framing is restricted",
      evidence: frameAncestors ?? xfo ?? "",
    });
  }

  const nosniff = headerValue(obs.headers, "x-content-type-options");
  if (!nosniff || nosniff.toLowerCase() !== "nosniff") {
    push(findings, {
      id: "hdr-nosniff",
      title: "X-Content-Type-Options is not nosniff",
      severity: "medium",
      category: "Headers",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: nosniff ? `Received “${nosniff}”.` : "Header was absent.",
      fix: headerSnippet("X-Content-Type-Options", "nosniff"),
    });
  } else {
    addPass(passes, { id: "hdr-nosniff", title: "MIME sniffing is disabled", evidence: nosniff });
  }

  const referrer = headerValue(obs.headers, "referrer-policy");
  if (!referrer) {
    push(findings, {
      id: "hdr-referrer",
      title: "Referrer-Policy is missing",
      severity: "low",
      category: "Headers",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.DS"],
      evidence: "The response did not include Referrer-Policy.",
      fix: headerSnippet("Referrer-Policy", "strict-origin-when-cross-origin"),
    });
  } else {
    addPass(passes, { id: "hdr-referrer", title: "Referrer-Policy is set", evidence: referrer });
  }

  if (!headerValue(obs.headers, "permissions-policy")) {
    push(findings, {
      id: "hdr-permissions",
      title: "Permissions-Policy is missing",
      severity: "info",
      category: "Headers",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: "The response did not include Permissions-Policy.",
      fix: headerSnippet("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()"),
    });
  }

  const powered = headerValue(obs.headers, "x-powered-by");
  if (powered) {
    push(findings, {
      id: "hdr-powered-by",
      title: "X-Powered-By discloses the stack",
      severity: "low",
      category: "Fingerprint",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: `X-Powered-By: ${powered}`,
      fix: `# nginx
proxy_hide_header X-Powered-By;

# Express
app.disable("x-powered-by");
`,
    });
  }

  const server = headerValue(obs.headers, "server");
  if (server && /\d/.test(server)) {
    push(findings, {
      id: "hdr-server-version",
      title: "Server header includes a version",
      severity: "low",
      category: "Fingerprint",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["PR.PS"],
      evidence: `Server: ${server}`,
      fix: `# nginx
server_tokens off;
`,
    });
  }

  const cookies = headerList(obs.headers, "set-cookie");
  const weak = cookies
    .map((raw) => {
      const parts = raw.split(";").map((part) => part.trim());
      const name = parts[0]?.split("=")[0] || "cookie";
      const flags = parts.slice(1).map((part) => part.toLowerCase());
      return {
        name,
        secure: flags.includes("secure"),
        httpOnly: flags.includes("httponly"),
        sameSite: flags.some((flag) => flag.startsWith("samesite=")),
      };
    })
    .filter((cookie) => https ? !(cookie.secure && cookie.httpOnly && cookie.sameSite) : !(cookie.httpOnly && cookie.sameSite));
  if (weak.length) {
    push(findings, {
      id: "cookie-flags",
      title: "Session cookies are missing security flags",
      severity: "high",
      category: "Cookies",
      owasp: ["A07:2025 Authentication Failures", "A07:2021 Identification and Authentication Failures"],
      nistCsf: ["PR.AA", "PR.DS"],
      evidence: weak
        .map((cookie) => `${cookie.name}: Secure=${cookie.secure}, HttpOnly=${cookie.httpOnly}, SameSite=${cookie.sameSite}`)
        .join("; "),
      fix: `# Express
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
});
`,
    });
  } else if (cookies.length) {
    addPass(passes, { id: "cookie-flags", title: "Cookie flags look complete", evidence: `${cookies.length} Set-Cookie header(s) included the expected flags.` });
  }

  if (obs.cors && !obs.cors.error) {
    const origin = obs.cors.allowOrigin;
    const credentials = (obs.cors.allowCredentials ?? "").toLowerCase() === "true";
    if (origin === "*") {
      push(findings, {
        id: "cors-wildcard",
        title: credentials ? "CORS allows any origin with credentials" : "CORS allows any origin",
        severity: credentials ? "critical" : "medium",
        category: "CORS",
        owasp: ["A01:2025 Broken Access Control", "A05:2021 Security Misconfiguration"],
        nistCsf: ["PR.AA", "PR.DS"],
        evidence: `Access-Control-Allow-Origin: *${credentials ? " and Access-Control-Allow-Credentials: true" : ""}. Probe origin was ${obs.cors.requestOrigin}.`,
        fix: `Reflect an allowlist, never "*". Do not combine a reflected origin with credentials unless the origin is explicitly trusted.\n\n# Express\nconst allow = new Set(["https://app.example.com"]);\napp.use((req, res, next) => {\n  const origin = req.headers.origin;\n  if (typeof origin === "string" && allow.has(origin)) {\n    res.setHeader("Access-Control-Allow-Origin", origin);\n    res.setHeader("Vary", "Origin");\n  }\n  next();\n});\n`,
      });
    } else if (origin && origin !== "null" && origin.toLowerCase() === obs.cors.requestOrigin.toLowerCase()) {
      push(findings, {
        id: "cors-reflect",
        title: "CORS reflects an arbitrary origin",
        severity: credentials ? "critical" : "high",
        category: "CORS",
        owasp: ["A01:2025 Broken Access Control"],
        nistCsf: ["PR.AA"],
        evidence: `The server reflected ${origin}${credentials ? " and allowed credentials" : ""}.`,
        fix: "Compare the request Origin to an explicit allowlist before setting Access-Control-Allow-Origin. Never echo the request Origin by default.",
      });
    } else if (origin === "null") {
      push(findings, {
        id: "cors-null",
        title: "CORS allows the null origin",
        severity: "medium",
        category: "CORS",
        owasp: ["A01:2025 Broken Access Control"],
        nistCsf: ["PR.AA"],
        evidence: "Access-Control-Allow-Origin: null",
        fix: "Remove the null origin from the allowlist. Sandboxed or opaque origins can send Origin: null.",
      });
    } else {
      addPass(passes, {
        id: "cors",
        title: "CORS did not reflect the probe origin",
        evidence: origin ? `Access-Control-Allow-Origin: ${origin}` : "No Access-Control-Allow-Origin on the probe.",
      });
    }
  }

  if (https && html) {
    const scriptHits = obs.bodySample.match(/<script[^>]+src\s*=\s*["']http:\/\//gi) ?? [];
    const resourceHits = obs.bodySample.match(/\b(?:src|href|action)\s*=\s*["']http:\/\/[^"']+/gi) ?? [];
    if (scriptHits.length || resourceHits.length) {
      const severity: Severity = scriptHits.length ? "medium" : "low";
      push(findings, {
        id: "mixed-content",
        title: "Page references cleartext HTTP resources",
        severity,
        category: "Mixed content",
        owasp: ["A04:2025 Cryptographic Failures", "A02:2025 Security Misconfiguration"],
        nistCsf: ["PR.DS"],
        evidence: `${scriptHits.length} script reference(s) and ${resourceHits.length} resource reference(s) use http://. Sample: ${(resourceHits[0] ?? "").slice(0, 140)}`,
        fix: `Rewrite resource URLs to https. As a backstop, add upgrade-insecure-requests to Content-Security-Policy.\n\n${headerSnippet("Content-Security-Policy", "upgrade-insecure-requests")}`,
      });
    } else {
      addPass(passes, { id: "mixed-content", title: "No mixed content in the sampled HTML", evidence: "The sampled document did not reference http:// scripts or resources." });
    }
  }

  const readable: string[] = [];
  for (const probe of obs.pathProbes) {
    const spec = PATH_CHECKS.find((item) => item.path === probe.path);
    if (!spec || probe.status == null) continue;
    if (probe.status === 200 || probe.status === 206) {
      readable.push(probe.path);
      push(findings, {
        id: `path-${probe.path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "")}`,
        title: spec.title,
        severity: spec.severity,
        category: "Exposure",
        owasp: ["A02:2025 Security Misconfiguration", "A01:2025 Broken Access Control"],
        nistCsf: ["PR.DS", "PR.PS"],
        evidence: `HEAD ${probe.path} returned ${probe.status}${probe.contentType ? ` (${probe.contentType})` : ""}${probe.contentLength ? `, content-length ${probe.contentLength}` : ""}. Response bodies were not stored${probe.gitRef ? `, except a git ref check: ${probe.gitRef}` : ""}.`,
        fix: pathDenySnippet(probe.path),
      });
    }
  }
  if (obs.pathProbes.length && readable.length === 0) {
    addPass(passes, {
      id: "paths",
      title: "Checked sensitive paths were not publicly readable",
      evidence: `${obs.pathProbes.length} well-known paths were requested with HEAD. None returned 200.`,
    });
  }

  const robots = (obs.robotsTxt.body ?? "").toLowerCase();
  if (obs.robotsTxt.status !== 200) {
    push(findings, {
      id: "robots-missing",
      title: "robots.txt was not published",
      severity: "info",
      category: "Crawler policy",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["GV.PO"],
      evidence: obs.robotsTxt.error ?? `Status ${obs.robotsTxt.status ?? "unavailable"}.`,
      fix: "Publish /robots.txt. It is a preference file, not an enforcement control. Pair it with server-side allow/deny rules.",
    });
  } else if (!AI_TOKENS.some((token) => robots.includes(token))) {
    push(findings, {
      id: "robots-ai",
      title: "robots.txt does not name common AI crawlers",
      severity: "low",
      category: "Crawler policy",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["GV.PO", "DE.CM"],
      evidence: "The file was present, and GPTBot, ClaudeBot, Google-Extended, Bytespider, CCBot, and Amazonbot were not mentioned.",
      fix: "Use the policy editor to generate robots.txt and ai.txt, then enforce the same decision in middleware. A crawler can ignore robots.txt.",
    });
  } else {
    addPass(passes, { id: "robots-ai", title: "robots.txt names AI crawlers", evidence: "At least one catalogued AI crawler token is present." });
  }

  if (obs.aiTxt.status !== 200) {
    push(findings, {
      id: "ai-txt-missing",
      title: "ai.txt was not published",
      severity: "info",
      category: "Crawler policy",
      owasp: ["A02:2025 Security Misconfiguration"],
      nistCsf: ["GV.PO"],
      evidence: obs.aiTxt.error ?? `Status ${obs.aiTxt.status ?? "unavailable"}. Checked /ai.txt.`,
      fix: "Publish a machine-readable AI usage preference. Bastion's generator follows the informational ai.txt draft and is not a legal instrument by itself.",
    });
  } else {
    addPass(passes, { id: "ai-txt", title: "ai.txt is published", evidence: (obs.aiTxt.body ?? "").slice(0, 160) });
  }

  const generator = /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i.exec(obs.bodySample)?.[1] ?? null;
  return {
    findings,
    passes,
    fingerprint: {
      server,
      poweredBy: powered,
      generator,
    },
  };
}
