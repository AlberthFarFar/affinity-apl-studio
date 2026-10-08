export interface FalOpenRouterParams {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | any[] }>;
  model?: string;
  responseFormatJson?: boolean;
  tools?: unknown[];
  apiKey?: string;
}

export async function callGPTViaFal(params: FalOpenRouterParams): Promise<string> {
  const currentKey = (params.apiKey || process.env.FAL_KEY || '').trim();
  if (!currentKey) {
    throw new Error('FAL_KEY belum dikonfigurasi di server environment / Secrets.');
  }

  const model = params.model || 'openai/gpt-5';
  const url = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
  let lastError: unknown = null;

  // One retry keeps transient fal/OpenRouter failures from surfacing immediately.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Key ${currentKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: params.messages,
          response_format: params.responseFormatJson ? { type: 'json_object' } : undefined,
          tools: params.tools?.length ? params.tools : undefined,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        const detail = errJson?.detail || errJson?.error?.message || response.statusText;
        throw new Error(`HTTP ${response.status}: ${detail}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return content;
      }
      throw new Error('Respons GPT tidak mengandung konten teks yang valid.');
    } catch (err) {
      lastError = err;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw lastError;
}
