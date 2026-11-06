import { describe, expect, it } from "vitest";
import { detectAnomalies } from "@/lib/bots/anomalies";
import { classifyUserAgent } from "@/lib/bots/classify";
import { defaultPolicy, renderAiTxt, renderMiddleware, renderRobots } from "@/lib/bots/policy";

describe("agent classification", () => {
  it("names known crawlers and keeps the more specific token", () => {
    expect(classifyUserAgent("Mozilla/5.0 (compatible; GPTBot/1.2; +https://openai.com/gptbot)").agent).toBe("GPTBot");
    const apple = classifyUserAgent("Mozilla/5.0 Applebot-Extended/1.0");
    expect(apple.agent).toBe("Applebot-Extended");
    expect(apple.matches.map((match) => match.id)).toEqual(["Applebot-Extended"]);
    expect(classifyUserAgent("Mozilla/5.0 (Macintosh) Safari/605.1.15").category).toBe("likely-browser");
    expect(classifyUserAgent("python-requests/2.31.0").category).toBe("automation");
  });

  it("raises spoofing hints and burst flags without calling them proof", () => {
    const mixed = classifyUserAgent("GPTBot/1.0 curl/8.4.0");
    const hints = detectAnomalies({ userAgent: "GPTBot/1.0 curl/8.4.0", classification: mixed, priorSameIp: 0, source: "server" });
    expect(hints.map((hint) => hint.code)).toContain("mixed-client");
    expect(hints[0]?.detail.toLowerCase()).toContain("hint");
    const conflict = classifyUserAgent("GPTBot/1.0 ClaudeBot/1.0");
    expect(detectAnomalies({ userAgent: "GPTBot/1.0 ClaudeBot/1.0", classification: conflict, priorSameIp: 0, source: "server" }).map((item) => item.code)).toContain("conflicting-identity");
    const burst = detectAnomalies({ userAgent: "python-requests/2.31.0", classification: classifyUserAgent("python-requests/2.31.0"), priorSameIp: 14, source: "server" });
    expect(burst.find((item) => item.code === "burst-rate")?.severity).toBe("medium");
  });

  it("renders deny rules for training crawlers", () => {
    const rules = defaultPolicy();
    const robots = renderRobots(rules);
    expect(robots).toContain("User-agent: GPTBot");
    expect(robots).toContain("Disallow: /");
    expect(robots).toContain("Content-signal:");
    const ai = renderAiTxt(rules, "shop.example");
    expect(ai).toContain("Agent: GPTBot");
    expect(ai).toContain("Training: deny");
    expect(renderMiddleware(rules)).toContain("gptbot");
  });
});
