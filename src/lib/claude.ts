// Claude (optional, a desk's own key from Connectors or ANTHROPIC_API_KEY): answers the Ask bot's open questions.
// Desk numbers still come only from the desk's own data; Claude phrases and advises around them.
import Anthropic from "@anthropic-ai/sdk";

import { connectorKey } from "./connectors";

export const hasClaude = () => !!connectorKey("claude");

/** One short answer. Low effort: these are chat replies, not research. Throws on failure; callers fall back. */
export async function askClaude(system: string, prompt: string, maxTokens = 1200): Promise<string> {
  const client = new Anthropic({ apiKey: connectorKey("claude"), timeout: 30_000, maxRetries: 1 });
  const res = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
    output_config: { effort: "low" },
    // If Claude declines on safety grounds, the API retries on a fallback model in the same call.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  } as any);
  if (res.stop_reason === "refusal") throw new Error("Claude declined this question.");
  const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n").trim();
  if (!text) throw new Error("Claude returned an empty answer.");
  return text;
}
