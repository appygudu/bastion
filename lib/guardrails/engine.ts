import { sha256 } from "@/lib/security/secrets";
import type { Severity } from "@/lib/types";

export interface GuardrailFinding {
  id: string;
  severity: Severity;
  title: string;
  owaspLlm: string;
  atlas: string | null;
  evidence: string;
}

const INJECTION_RULES: { id: string; title: string; owaspLlm: string; pattern: RegExp }[] = [
  {
    id: "llm-ignore-instructions",
    title: "Instruction-override indicator",
    owaspLlm: "LLM01:2025 Prompt Injection",
    pattern: /ignore (?:all |any |the )?(?:previous|prior|above) (?:instructions|rules|prompts)/i,
  },
  {
    id: "llm-disregard-system",
    title: "System-instruction override indicator",
    owaspLlm: "LLM01:2025 Prompt Injection",
    pattern: /disregard (?:your |the )?(?:system|developer|previous)/i,
  },
  {
    id: "llm-reveal-prompt",
    title: "System-prompt disclosure indicator",
    owaspLlm: "LLM07:2025 System Prompt Leakage",
    pattern: /reveal (?:your |the )?(?:system prompt|hidden prompt|initial instructions)/i,
  },
  {
    id: "llm-role-hijack",
    title: "Role-hijack indicator",
    owaspLlm: "LLM01:2025 Prompt Injection",
    pattern: /you are now (?:a |an )?(?:dan|developer mode|unrestricted|jailbroken)/i,
  },
];

const RISKY_TOOL = /(^|[^a-z])(shell|exec|bash|powershell|eval|child_process|delete_file|run_command|sql_exec)([^a-z]|$)/i;
const SUCCESS = /^(success|succeeded|allowed|ok|completed)$/i;

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = num.charCodeAt(i) - 48;
    if (n < 0 || n > 9) return false;
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return num.length > 0 && sum % 10 === 0;
}

export function reviewAgentCall(input: { tool: string; outcome: string; content: string }): GuardrailFinding[] {
  const findings: GuardrailFinding[] = [];
  const content = input.content ?? "";

  for (const rule of INJECTION_RULES) {
    const match = content.match(rule.pattern);
    if (!match) continue;
    findings.push({
      id: rule.id,
      severity: "high",
      title: rule.title,
      owaspLlm: rule.owaspLlm,
      atlas: "AML.T0051 LLM Prompt Injection",
      evidence: `Matched indicator “${match[0].slice(0, 80)}”. The raw prompt is not stored.`,
    });
  }

  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(content)) {
    findings.push({
      id: "pii-email",
      severity: "medium",
      title: "Email-shaped string in tool context",
      owaspLlm: "LLM02:2025 Sensitive Information Disclosure",
      atlas: null,
      evidence: "An email-shaped string was present. The value was redacted and is not stored.",
    });
  }
  if (/\b\d{3}-\d{2}-\d{4}\b/.test(content)) {
    findings.push({
      id: "pii-ssn",
      severity: "high",
      title: "National-identifier pattern in tool context",
      owaspLlm: "LLM02:2025 Sensitive Information Disclosure",
      atlas: null,
      evidence: "A US-style identifier pattern was present. The value was redacted and is not stored.",
    });
  }
  const card = content.match(/\b(?:\d[ -]?){13,19}\b/);
  if (card) {
    const digits = card[0].replace(/[ -]/g, "");
    if (digits.length >= 13 && digits.length <= 19 && luhn(digits)) {
      findings.push({
        id: "pii-card",
        severity: "high",
        title: "Payment-card pattern in tool context",
        owaspLlm: "LLM02:2025 Sensitive Information Disclosure",
        atlas: null,
        evidence: "A Luhn-valid card-shaped number was present. The value was redacted and is not stored.",
      });
    }
  }
  if (/AKIA[0-9A-Z]{16}/.test(content) || /BEGIN (?:RSA |OPENSSH )?PRIVATE KEY/.test(content)) {
    findings.push({
      id: "secret-material",
      severity: "critical",
      title: "Secret material pattern in tool context",
      owaspLlm: "LLM02:2025 Sensitive Information Disclosure",
      atlas: null,
      evidence: "A cloud key id or private-key header was present. The value was redacted and is not stored.",
    });
  }
  if (RISKY_TOOL.test(input.tool) && SUCCESS.test(input.outcome)) {
    findings.push({
      id: "excessive-agency",
      severity: "high",
      title: "High-impact tool completed",
      owaspLlm: "LLM06:2025 Excessive Agency",
      atlas: "AML.T0010.005 AI Agent Tool",
      evidence: `Tool “${input.tool.slice(0, 64)}” completed with outcome “${input.outcome.slice(0, 32)}”. Confirm this action was inside the agent's mandate.`,
    });
  }
  if (content.length > 20000) {
    findings.push({
      id: "unbounded-context",
      severity: "low",
      title: "Very large tool context",
      owaspLlm: "LLM10:2025 Unbounded Consumption",
      atlas: null,
      evidence: `Context length was ${content.length} characters. Only the hash is stored.`,
    });
  }
  return findings;
}

export function hashPrompt(content: string): string {
  return sha256(content);
}
