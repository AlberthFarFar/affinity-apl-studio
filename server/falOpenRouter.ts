import { AIServiceError, describeAIError, falHttpError } from './aiErrors.ts';

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
    throw new AIServiceError('AI_KEY_NOT_CONFIGURED', 503, 'FAL_KEY belum dikonfigurasi di server environment / Secrets.');
  }

  const model = params.model || 'openai/gpt-5';
  const url = 'https://fal.run/openrouter/router/openai/v1/chat/completions';
  const signal = AbortSignal.timeout(60_000);

  // Retry only transient server/network failures, never denied access or billing.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        signal,
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

      const text = await response.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = null; }
      const requestId = response.headers.get('x-fal-request-id') || response.headers.get('x-request-id') || undefined;
      if (!response.ok || data?.error) {
        const embeddedStatus = Number(data?.error?.code);
        const status = response.ok
          ? (embeddedStatus >= 400 && embeddedStatus <= 599 ? embeddedStatus : 502)
          : response.status;
        throw falHttpError(status, data?.detail || data?.error?.message || text, requestId);
      }

      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim()) {
        return content;
      }
      throw new AIServiceError('AI_INVALID_RESPONSE', 502, 'Respons GPT tidak mengandung konten teks yang valid.');
    } catch (err) {
      const error = describeAIError(err);
      if (attempt === 1 || signal.aborted || !['AI_PROVIDER_UNAVAILABLE', 'AI_CONNECTION_ERROR'].includes(error.code)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1200));
    }
  }

  throw new AIServiceError('AI_CONNECTION_ERROR', 503, 'Layanan AI belum dapat dihubungi.', true);
}
