import type { TextProvider, TextRequest } from "./types";

export const claudeProvider: TextProvider = {
  name: "claude",
  available: () => Boolean(process.env.ANTHROPIC_API_KEY),
  async generate({ system, prompt, maxTokens = 4096 }: TextRequest) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5-5",
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
  },
};
