import express from 'express';
import { describeAIError } from './aiErrors.ts';
import { analyzeProjectIntelligence } from './projectIntelligence.ts';
import type { ProjectIntelligenceInput } from '../src/types/projectIntelligence.ts';

type AnalyzeProject = (input: ProjectIntelligenceInput) => Promise<unknown>;

interface ProjectIntelligenceRouterOptions {
  analyze?: AnalyzeProject;
  apiKey?: string;
}

export function normalizeProjectUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname.includes('.') || Boolean(url.username) || Boolean(url.password)) return null;
    return url.toString();
  } catch {
    return null;
  }
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

    const rawUrls = Array.isArray(urls)
      ? urls.filter((url): url is string => typeof url === 'string' && Boolean(url.trim()))
      : [];
    const suppliedUrls = rawUrls.map(normalizeProjectUrl);
    const invalidUrl = rawUrls.find((_url, index) => !suppliedUrls[index]);
    if (invalidUrl) {
      return res.status(400).json({
        success: false,
        error: `URL tidak valid: ${invalidUrl}. Masukkan alamat domain atau URL publik yang valid.`,
      });
    }

    try {
      const intelligence = await analyze({
        projectName: projectName.trim(),
        clusterName: typeof clusterName === 'string' ? clusterName.trim() : undefined,
        unitType: typeof unitType === 'string' ? unitType.trim() : undefined,
        urls: suppliedUrls.filter((url): url is string => Boolean(url)),
        discover: Boolean(discover),
      });
      return res.json({ success: true, intelligence });
    } catch (err: unknown) {
      const error = describeAIError(err);
      console.info('Project Intelligence failed:', { code: error.code, status: error.status, requestId: error.requestId });
      return res.status(error.status).json({
        success: false, error: error.message, code: error.code,
        retryable: error.retryable, requestId: error.requestId,
      });
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
