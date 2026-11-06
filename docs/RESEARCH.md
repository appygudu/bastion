# Bastion research notes

Retrieved 23 October 2026. This note grounds the product. It does not claim Bastion measured any of the figures below. Where a source reports a rate, that rate is the source's, quoted narrowly. Counts on living knowledge bases change.

## Threats the product is built around

### Web and API applications

The current OWASP Top 10 is the 2025 edition. OWASP states that 2021 is superseded. The 2025 list is Broken Access Control, Security Misconfiguration, Software Supply Chain Failures, Cryptographic Failures, Injection, Insecure Design, Authentication Failures, Software or Data Integrity Failures, Security Logging and Alerting Failures, and Mishandling of Exceptional Conditions. Server-side request forgery was folded into Broken Access Control. Software Supply Chain Failures expands the 2021 "Vulnerable and Outdated Components" category to dependencies, build systems, and distribution.

OWASP's own description of the contributed data for 2025 says, among other figures: on average 3.73% of applications tested had one or more of 40 CWEs in Broken Access Control; 3.00% had one or more of 16 CWEs in Security Misconfiguration; 3.80% had one or more of 32 CWEs in Cryptographic Failures. Those are OWASP's testing-data summaries, not Bastion telemetry.

The 2021 list remains the one many control frameworks still cite: Broken Access Control, Cryptographic Failures, Injection, Insecure Design, Security Misconfiguration, Vulnerable and Outdated Components, Identification and Authentication Failures, Software and Data Integrity Failures, Security Logging and Monitoring Failures, and SSRF. OWASP's 2021 introduction reports, for that cycle's contributed data, an average incidence of 3.81% for Broken Access Control with more than 318,000 CWE occurrences, an average injection incidence of 3.37% (94% of applications tested, maximum incidence 19%, 274,000 occurrences), and an average misconfiguration incidence of 4.5% (90% tested, more than 208,000 occurrences).

API Security Top 10:2023 is a separate list: Broken Object Level Authorization, Broken Authentication, Broken Object Property Level Authorization, Unrestricted Resource Consumption, Broken Function Level Authorization, Unrestricted Access to Sensitive Business Flows, Server Side Request Forgery, Security Misconfiguration, Improper Inventory Management, and Unsafe Consumption of APIs. Bastion does not test object-level authorization. CORS reflection and sensitive-path exposure are the closest passive signals, and the product says so.

Credential stuffing, in OWASP's cheat sheet, is testing username and password pairs taken from another site's breach. It is distinct from brute force (many passwords, one account) and password spraying (one weak password, many accounts). The 2025 Authentication Failures page uses credential stuffing as an example attack scenario. Bastion does not perform it. The ledger can show a burst of repeated calls to a path such as `/login` from one address, which is a detection signal, not a test of the passwords.

### Supply chain

CISA describes a software supply chain attack as a threat actor compromising software before it reaches the customer, including by hijacking updates, undermining code signing, or compromising open-source code. The OWASP Software Supply Chain cheat sheet groups threats into source, build, dependency, and deployment or runtime, and names dependency confusion, upstream compromise, and CI/CD account takeover. OSV.dev, operated as a public vulnerability database with a documented query API, is the lookup Bastion uses for a pasted manifest. It is not a full SBOM or build-provenance system.

### LLM applications, prompt injection, and agent abuse

The OWASP Top 10 for LLM Applications 2025 (version 2025, 18 November 2024) is: Prompt Injection, Sensitive Information Disclosure, Supply Chain, Data and Model Poisoning, Improper Output Handling, Excessive Agency, System Prompt Leakage, Vector and Embedding Weaknesses, Misinformation, and Unbounded Consumption. The project leads describe Excessive Agency as more important because agents are being given tools, and System Prompt Leakage as something teams had been treating as secret when it is not reliably secret. Unbounded Consumption widens the old denial-of-service item to cost and resource use.

MITRE ATLAS is a living knowledge base of adversary behavior against AI systems. On 23 October 2026 its homepage presented 16 tactics, 208 techniques, 40 mitigations, and 73 case studies, and described adversaries operating against agent logic, planning loops, tool integrations, and control policies. A MITRE crosswalk page lists AML.T0051 as LLM Prompt Injection and AML.T0010.005 as the AI Agent Tool sub-technique of AI Supply Chain Compromise. Those identifiers are used as labels in Bastion, not as a claim that a regex match is a confirmed ATLAS incident.

"Agent hijacking" is not a single OWASP or MITRE title. The defensive problem Bastion records is the combination of prompt injection (LLM01, AML.T0051) and an agent that then completes a high-impact tool call (LLM06 Excessive Agency). The log stores a prompt hash and the rule result. It does not store the prompt, and it does not try the injection.

### Bots, crawlers, and AI training

Cloudflare's AI Crawl Control documentation lists operator-published user-agent tokens, including GPTBot, ChatGPT-User, OAI-SearchBot, ClaudeBot, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User, Google-Extended (via the managed robots examples), Bytespider, CCBot, and others. On the free plan, Cloudflare says detection is the user-agent string; paid Bot Management adds a detection id. Bastion's classifier is the user-agent kind of check, and the UI says a token is not authentication of the operator.

Cloudflare also states that robots.txt compliance is voluntary and does not technically prevent access. Their managed robots.txt uses a Content-signal comment block (`search`, `ai-input`, `ai-train`) plus per-agent `Disallow` lines. The IETF AIPREF working group is specifying a `Content-Usage` rule for robots.txt (draft-ietf-aipref-attach, an Internet-Draft). A separate informational draft, draft-car-ai-txt-wellknown-00 (June 2026), proposes `/.well-known/ai.txt` for training, scraping, licensing, and per-agent rules. Bastion's generator follows those published shapes and labels them as preferences and drafts, not standards and not enforcement.

OWASP's Bot Management and Anti-Automation cheat sheet names credential stuffing (OAT-008), scraping (OAT-011), and vulnerability scanning (OAT-014) among automated threats. That is the defensive context for the ledger. Bastion is not a bot-challenge or proof-of-work product.

### Headers and the scanner's own request safety

The OWASP Secure Headers Project proposes, among other values, `Strict-Transport-Security: max-age=63072000; includeSubDomains` (explicitly without `preload` by default), `X-Frame-Options: deny`, `X-Content-Type-Options: nosniff`, and a Content-Security-Policy baseline of `default-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; upgrade-insecure-requests`. Bastion's copy-paste fixes use that baseline and tell the operator to tune origins.

The OWASP SSRF Prevention cheat sheet says deny-lists are a last resort and, if used, should include cloud metadata (`169.254.169.254`, `metadata.google.internal`), loopback, RFC1918, and IPv6 unique-local and link-local ranges. It also says redirects must be revalidated. Bastion's scanner does that before any connection, pins DNS to a public address, limits redirects, timeouts, and body size, and only uses web ports. That is a control on Bastion itself, not a finding about the customer's SSRF bugs. The customer scanner does not test for SSRF in the target.

## Standards used as labels

| Source | What Bastion borrows | What it does not claim |
| --- | --- | --- |
| NIST CSF 2.0 (CSWP 29, 26 February 2024) | Function and category identifiers from the Core: GV.SC, GV.OV, PR.AA, PR.DS, PR.PS, DE.CM, DE.AE, RS.MA | A profile, a tier, or that an outcome is met |
| NIST AI RMF 1.0 (AI 100-1, 26 January 2023) | GOVERN, MAP, MEASURE, MANAGE as the shape of an AI risk program. NIST's site says 1.0 is being revised | A trustworthy-AI assessment |
| ISO/IEC 27001:2022 | Annex A 8.15: logs of activities, exceptions, faults, and other relevant events shall be produced, stored, protected, and analysed | Certification, or a full ISMS |
| SOC 2 / AICPA Trust Services Criteria | CC7.2: monitor components for anomalies that may indicate malicious acts, disasters, or errors, and analyse them | A SOC 2 report |
| MITRE ATT&CK | The enterprise knowledge base (v20, October 2026: 15 tactics, 227 techniques, 479 sub-techniques) as context for web and credential abuse | Coverage of the matrix |
| MITRE ATLAS | Labels for prompt injection and agent-tool abuse | Confirmed adversary attribution |

ISO sells the standard. The A.8.15 sentence above is the control statement as published in public copies of the text, used here as a short quotation so a reader can see which control the ledger is aimed at. Bastion's chain is tamper-evident inside one database. It is not write-once storage.

## Competitors and the gap

These products are real and broader than Bastion. The gap is the combination, not a claim that they are weak.

- **Snyk** scans code, open source, containers, IaC, and APIs, and is built into the developer workflow. It is not a first-party ledger of AI crawlers with a hash-chained export and a robots/ai.txt generator.
- **Wiz** connects code, cloud, and runtime in a security graph, including AI security posture. It assumes a cloud footprint. It is not a paste-a-URL passive header review with copy-paste nginx fixes for a team that has not deployed a CNAPP.
- **Cloudflare Bot Management and AI Crawl Control** is the mature edge control for known crawlers, including allow/block and managed robots.txt. It applies to traffic proxied by Cloudflare. It does not review a `package.json` against OSV, log LLM tool calls against the LLM Top 10, or produce one executive brief that joins header findings and agent logs.
- **Datadog Cloud Security** (and the wider Datadog Security set, which includes Cloud SIEM and an AI Guard entry in the product index) correlates posture with observability. It is a platform subscription, not a single defensive workspace a team can run from SQLite and an Express middleware.
- **Lakera / Check Point AI Guardrails** screens prompts, outputs, tool calls, and tool responses, with detectors for prompt attacks, data leakage, and off-policy agent behavior, mapped by them to OWASP and ATLAS. It does not assess security headers or publish a crawler policy for the website.
- **Protect AI** describes a platform (Guardian, Recon, Layer) for AI applications from model selection through runtime. The public positioning is AI-system security, not website misconfiguration plus a crawler ledger.
- **Palo Alto Prisma AIRS** offers an API intercept that scans prompts and responses, including prompt-injection detection, without forcing a network detour. It is a runtime AI control. It is not the passive web scanner or the audit export.

The open gap Bastion is aimed at: one workspace, for assets the team owns, that (1) does a safe passive web pass with a concrete fix, (2) records which bots and agents actually arrived, (3) logs agent tool calls against the LLM Top 10 without keeping the prompt, and (4) prints an executive brief that states its limits. It does not replace a CNAPP, a WAF, or a model firewall.

## What that implies for the MVP

- Passive checks only, with an ownership attestation and SSRF controls on the scanner.
- Fixes cite the OWASP header baseline, including the decision to omit HSTS `preload` by default.
- Dependency results come from OSV.dev or they are not shown. Unpinned versions are not given a fake CVE.
- Crawler names come from published user-agent tokens. Classification is a hint.
- `robots.txt` and `ai.txt` are generated as preferences. Enforcement is a middleware snippet the customer deploys.
- Agent rules are indicators. They map to LLM01, LLM02, LLM06, LLM07, and LLM10 when those patterns match. They do not claim to detect poisoning, embedding attacks, or misinformation.
- The score is a published weight table, printed as a heuristic.
- The hash chain is documented as detection of edits, not as a control against an administrator who can rewrite the database.

## Sources

- OWASP Top 10:2025, https://owasp.org/Top10/2025/ and introduction https://owasp.org/Top10/2025/0x00_2025-Introduction/
- OWASP Top 10:2021, https://owasp.org/Top10/2021/ and the 2021 introduction text mirrored at https://github.com/OWASP/Top10/blob/85362e6f/2021/docs/index.md
- OWASP project page stating 2025 is current, https://owasp.org/projects/top-ten
- OWASP API Security Top 10 2023, https://owasp.org/API-Security/editions/2023/en/0x11-t10/
- OWASP Top 10 for LLM Applications 2025, https://genai.owasp.org/llm-top-10/ and PDF https://owasp.org/www-project-top-10-for-large-language-model-applications/assets/PDF/OWASP-Top-10-for-LLMs-v2025.pdf
- OWASP Credential Stuffing Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Credential_Stuffing_Prevention_Cheat_Sheet.html
- OWASP Bot Management and Anti-Automation Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Bot_Management_and_Anti-Automation_Cheat_Sheet.html
- OWASP Software Supply Chain Security Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html
- OWASP Secure Headers Project, best practices, https://secure-headers-project.owasp.org/best-practices/
- OWASP SSRF Prevention Cheat Sheet, https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html
- CISA, Defending Against Software Supply Chain Attacks, https://www.cisa.gov/sites/default/files/publications/defending_against_software_supply_chain_attacks_508.pdf
- NIST CSF 2.0, https://doi.org/10.6028/NIST.CSWP.29 and https://www.nist.gov/cyberframework
- NIST AI RMF 1.0, https://doi.org/10.6028/NIST.AI.100-1 and revision note https://www.nist.gov/itl/ai-risk-management-framework
- ISO/IEC 27001:2022 catalogue entry, https://www.iso.org/standard/27001 — Annex A 8.15 control statement as reproduced in public copies of the standard
- AICPA Trust Services Criteria discussion of CC7.2 (monitoring for anomalies), described in practitioner material such as https://www.compliancebase.org/controls/soc-2/cc7-2 and the 2022 SOC 2 guide. Bastion does not reproduce the AICPA criteria text beyond the CC7.2 objective.
- MITRE ATT&CK, https://attack.mitre.org/ and v20 update https://attack.mitre.org/resources/updates/
- MITRE ATLAS, https://atlas.mitre.org/ and technique crosswalk https://d3fend.mitre.org/offensive-technique/
- Cloudflare, Manage AI crawlers, https://developers.cloudflare.com/ai-crawl-control/features/manage-ai-crawlers/
- Cloudflare bot reference, https://developers.cloudflare.com/ai-crawl-control/reference/bots/
- Cloudflare managed robots.txt and content signals, https://developers.cloudflare.com/bots/additional-configurations/managed-robots-txt/
- IETF draft-ietf-aipref-attach, https://datatracker.ietf.org/doc/html/draft-ietf-aipref-attach
- IETF draft-car-ai-txt-wellknown-00, https://datatracker.ietf.org/doc/draft-car-ai-txt-wellknown/00/
- RFC 9309, Robots Exclusion Protocol, https://www.rfc-editor.org/rfc/rfc9309
- OSV.dev `POST /v1/query` and `POST /v1/querybatch`, https://google.github.io/osv.dev/post-v1-query/ and https://google.github.io/osv.dev/post-v1-querybatch/
- Snyk, https://docs.snyk.io/whats-snyk
- Wiz, https://www.wiz.io/ and https://www.wiz.io/platform/wiz-cloud
- Datadog Cloud Security, https://www.datadoghq.com/product/cloud-security/ and https://docs.datadoghq.com/security/
- Check Point / Lakera AI Guardrails, https://docs.lakera.ai/guard.md
- Protect AI, https://protect.ai/
- Palo Alto Prisma AIRS, https://www.paloaltonetworks.com/ai-security/prisma-airs and API intercept docs https://docs.paloaltonetworks.com/prisma-airs/ai-runtime-security/airs-api
