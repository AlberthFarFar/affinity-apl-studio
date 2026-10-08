export class ProjectIntelligenceApiError extends Error {
  constructor(message: string, public readonly code?: string, public readonly requestId?: string) {
    super(message);
    this.name = 'ProjectIntelligenceApiError';
  }
}

export async function readProjectIntelligenceResponse(response: Response) {
  // Some preview proxies change Content-Type. Parse the body once, but never
  // display raw HTML or a gateway response as an application error message.
  const text = await response.text();
  let data: any;
  try { data = JSON.parse(text); } catch { data = null; }
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    if (!response.ok || data.success === false) {
      throw new ProjectIntelligenceApiError(
        typeof data.error === 'string' ? data.error : `Analisis AI gagal (HTTP ${response.status}).`,
        typeof data.code === 'string' ? data.code : undefined,
        typeof data.requestId === 'string' ? data.requestId : undefined,
      );
    }
    if (data.success === true && data.intelligence?.project && data.intelligence?.identityMatch && data.intelligence?.visualDNA) return data;
  }
  const messages: Record<number, string> = {
    401: 'Akses API ditolak (HTTP 401). Periksa autentikasi aplikasi dan konfigurasi FAL_KEY pada server.',
    403: 'Permintaan ditolak (HTTP 403). Buka Diagnostik untuk memeriksa akses layanan AI; hubungi dukungan fal.ai jika muncul pembatasan kebijakan.',
    404: 'Layanan Project Intelligence belum tersedia. Jalankan Affinity melalui server aplikasi, bukan sebagai situs statis.',
    429: 'Batas permintaan tercapai. Tunggu beberapa saat sebelum mencoba kembali.',
    502: 'Gateway tidak menerima respons API yang valid (HTTP 502). Periksa log backend dan Diagnostik.',
    503: 'Layanan AI atau server aplikasi belum tersedia (HTTP 503). Periksa Diagnostik dan log backend.',
    504: 'Permintaan AI melewati batas waktu (HTTP 504). Coba kembali beberapa saat lagi.',
  };
  throw new ProjectIntelligenceApiError(messages[response.status] || `Respons API tidak sesuai format (HTTP ${response.status}). Periksa apakah versi frontend dan backend sama serta server aplikasi aktif.`);
}
