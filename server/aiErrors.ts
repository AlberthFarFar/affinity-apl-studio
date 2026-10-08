export class AIServiceError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
    public readonly retryable = false,
    public readonly requestId?: string,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Only controlled messages and a bounded request ID cross the API boundary.
// Provider responses can contain HTML, prompts, or credentials; never echo them.
export function falHttpError(status: number, detail: unknown, requestId?: string): AIServiceError {
  const id = requestId && /^[a-zA-Z0-9_.:-]{1,160}$/.test(requestId) ? requestId : undefined;
  const message = typeof detail === 'string' ? detail : '';
  if (status === 403) {
    const policy = /policy violation|blocked for a previous|moderation|guardrail|terms of service/i.test(message);
    return new AIServiceError(
      policy ? 'AI_PROVIDER_POLICY_BLOCKED' : 'AI_PROVIDER_FORBIDDEN', 403,
      policy
        ? 'Akses GPT melalui fal.ai ditolak oleh penyedia AI karena pembatasan kebijakan (HTTP 403). Hubungi dukungan fal.ai untuk menelusuri pembatasan pada jalur OpenRouter/OpenAI. Muat ulang halaman atau mengganti URL proyek tidak menyelesaikan pembatasan ini.'
        : 'Akses model AI melalui fal.ai ditolak (HTTP 403). Periksa izin akses model pada akun fal.ai atau hubungi dukungan fal.ai.',
      false, id,
    );
  }
  if (status === 401) return new AIServiceError('AI_AUTH_ERROR', 401, 'FAL_KEY ditolak oleh fal.ai. Periksa secret FAL_KEY di server lalu terapkan perubahan.', false, id);
  if (status === 402) return new AIServiceError('AI_INSUFFICIENT_CREDITS', 402, 'Saldo layanan AI tidak mencukupi. Periksa saldo dan penagihan fal.ai.', false, id);
  if (status === 429) return new AIServiceError('AI_RATE_LIMIT', 429, 'Batas permintaan layanan AI tercapai. Tunggu beberapa saat sebelum mencoba kembali.', true, id);
  if (status >= 500) return new AIServiceError('AI_PROVIDER_UNAVAILABLE', 503, 'Layanan AI sedang mengalami gangguan. Coba kembali beberapa saat lagi.', true, id);
  return new AIServiceError('AI_REQUEST_REJECTED', 422, 'Permintaan ditolak oleh layanan AI. Periksa konfigurasi model dan parameter integrasi fal.ai.', false, id);
}

export function describeAIError(error: unknown): AIServiceError {
  if (error instanceof AIServiceError) return error;
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return new AIServiceError('AI_TIMEOUT', 504, 'Layanan AI tidak merespons dalam batas waktu. Coba kembali beberapa saat lagi.', true);
  }
  if (error instanceof SyntaxError || (error instanceof Error && /JSON/.test(error.message))) {
    return new AIServiceError('AI_INVALID_RESPONSE', 502, 'Layanan AI mengembalikan format hasil yang tidak valid. Silakan coba kembali.', true);
  }
  return new AIServiceError('AI_CONNECTION_ERROR', 503, 'Server belum dapat terhubung ke layanan AI. Periksa koneksi server dan coba kembali.', true);
}
