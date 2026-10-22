type LlmOptions = {
  system: string;
  user: string;
  timeoutMs?: number;
  maxTokens?: number;
};

export async function llmJson<T>({ system, user, timeoutMs = 8000, maxTokens = 900 }: LlmOptions): Promise<T | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;
  const base = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

  try {
    const response = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) return null;
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    return JSON.parse(content.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

export function llmConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY);
}
