import express from 'express';
import { analyzeProjectIntelligence } from './projectIntelligence.ts';
import type { ProjectIntelligenceInput } from '../src/types/projectIntelligence.ts';

type AnalyzeProject = (input: ProjectIntelligenceInput) => Promise<unknown>;

interface ProjectIntelligenceRouterOptions {
  analyze?: AnalyzeProject;
  apiKey?: string;
}

export function createProjectIntelligenceRouter(options: ProjectIntelligenceRouterOptions = {}) {
  const router = express.Router();
  const analyze = options.analyze || ((input) => analyzeProjectIntelligence(input, { apiKey: options.apiKey }));

  // Vite preview can mount this router without the parent Express body parser.
  router.use(express.json({ limit: '1mb' }));

  router.post('/analyze', async (req, res) => {
    const { projectName, clusterName, unitType, urls, discover } = req.body || {};
    if (typeof projectName !== 'string' || !projectName.trim()) {
      return res.status(400).json({ success: false, error: 'Nama project wajib diisi sebelum dianalisis.' });
    }

    const suppliedUrls = Array.isArray(urls)
      ? urls.filter((url) => typeof url === 'string' && url.trim())
      : [];
    const invalidUrl = suppliedUrls.find((url) => !/^https?:\/\//i.test(url));
    if (invalidUrl) {
      return res.status(400).json({
        success: false,
        error: `URL tidak valid: ${invalidUrl}. Gunakan URL publik yang diawali http:// atau https://.`,
      });
    }

    try {
      const intelligence = await analyze({
        projectName: projectName.trim(),
        clusterName: typeof clusterName === 'string' ? clusterName.trim() : undefined,
        unitType: typeof unitType === 'string' ? unitType.trim() : undefined,
        urls: suppliedUrls,
        discover: Boolean(discover),
      });
      return res.json({ success: true, intelligence });
    } catch (err: any) {
      console.error('Error analyzing project intelligence:', err);
      const message = String(err?.message || 'Gagal menganalisis Project Intelligence.');
      const userMessage = message.includes('FAL_KEY')
        ? message
        : message.includes('JSON')
          ? 'Analisis selesai tetapi format respons AI tidak valid. Silakan coba kembali atau gunakan link resmi lain.'
          : 'Project belum dapat dianalisis. Periksa apakah URL bersifat publik, lalu coba kembali.';
      return res.status(502).json({ success: false, error: userMessage, detail: message });
    }
  });

  // Express otherwise renders malformed JSON errors as HTML, which is unsafe for API clients.
  router.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof SyntaxError && 'body' in err) {
      return res.status(400).json({ success: false, error: 'Request JSON tidak valid.' });
    }
    return next(err);
  });

  return router;
}
