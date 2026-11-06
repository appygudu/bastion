export type AgentCategory = "ai-crawler" | "ai-search" | "ai-assistant" | "search";

export interface KnownAgent {
  id: string;
  vendor: string;
  category: AgentCategory;
  token: string;
}

/**
 * Tokens follow operator-published user-agent product tokens documented by
 * Cloudflare's AI crawler reference and the vendors' own crawler docs.
 * Matching is a hint, not authentication of the operator.
 */
export const KNOWN_AGENTS: KnownAgent[] = [
  { id: "GPTBot", vendor: "OpenAI", category: "ai-crawler", token: "gptbot" },
  { id: "ChatGPT-User", vendor: "OpenAI", category: "ai-assistant", token: "chatgpt-user" },
  { id: "OAI-SearchBot", vendor: "OpenAI", category: "ai-search", token: "oai-searchbot" },
  { id: "ClaudeBot", vendor: "Anthropic", category: "ai-crawler", token: "claudebot" },
  { id: "Claude-SearchBot", vendor: "Anthropic", category: "ai-search", token: "claude-searchbot" },
  { id: "Claude-User", vendor: "Anthropic", category: "ai-assistant", token: "claude-user" },
  { id: "PerplexityBot", vendor: "Perplexity", category: "ai-search", token: "perplexitybot" },
  { id: "Perplexity-User", vendor: "Perplexity", category: "ai-assistant", token: "perplexity-user" },
  { id: "Google-Extended", vendor: "Google", category: "ai-crawler", token: "google-extended" },
  { id: "GoogleOther", vendor: "Google", category: "ai-crawler", token: "googleother" },
  { id: "Google-CloudVertexBot", vendor: "Google", category: "ai-crawler", token: "google-cloudvertexbot" },
  { id: "Googlebot", vendor: "Google", category: "search", token: "googlebot" },
  { id: "Bingbot", vendor: "Microsoft", category: "search", token: "bingbot" },
  { id: "Bytespider", vendor: "ByteDance", category: "ai-crawler", token: "bytespider" },
  { id: "CCBot", vendor: "Common Crawl", category: "ai-crawler", token: "ccbot" },
  { id: "Amazonbot", vendor: "Amazon", category: "ai-crawler", token: "amazonbot" },
  { id: "Applebot-Extended", vendor: "Apple", category: "ai-crawler", token: "applebot-extended" },
  { id: "Applebot", vendor: "Apple", category: "ai-search", token: "applebot" },
  { id: "meta-externalagent", vendor: "Meta", category: "ai-crawler", token: "meta-externalagent" },
  { id: "FacebookBot", vendor: "Meta", category: "ai-crawler", token: "facebookbot" },
  { id: "DuckAssistBot", vendor: "DuckDuckGo", category: "ai-assistant", token: "duckassistbot" },
  { id: "MistralAI-User", vendor: "Mistral", category: "ai-assistant", token: "mistralai-user" },
];

export function agentById(id: string): KnownAgent | undefined {
  return KNOWN_AGENTS.find((agent) => agent.id.toLowerCase() === id.toLowerCase());
}
