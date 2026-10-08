import express from 'express';
import type { FalRunner } from './types.ts';
import { loadPresetLibrary } from './presets.ts';
import { dryRun, finishImage, generateStyle, retryScene } from './service.ts';

export interface VisualStyleLabFlags {
  labEnabled: boolean;
  paidGenerationEnabled: boolean;
}

export function resolveVisualStyleLabFlags(env: NodeJS.ProcessEnv = process.env): VisualStyleLabFlags {
  const isProduction = env.NODE_ENV === 'production';
  const labEnabled = isProduction
    ? env.VISUAL_STYLE_LAB_ENABLED === 'true'
    : env.VISUAL_STYLE_LAB_ENABLED !== 'false';
  return {
    labEnabled,
    // No authentication exists in this app. Paid lab endpoints are therefore
    // intentionally impossible in public/production deployments.
    paidGenerationEnabled: labEnabled && !isProduction && env.VISUAL_STYLE_LAB_PAID_GENERATION_ENABLED === 'true',
  };
}

export function createVisualStyleLabRouter(runner: FalRunner, getFalKey: () => string) {
  const router = express.Router();

  const requireLab = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!resolveVisualStyleLabFlags().labEnabled) return res.status(404).json({ success: false, error: 'LAB_DISABLED' });
    next();
  };
  const requirePaid = (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    const flags = resolveVisualStyleLabFlags();
    if (!flags.labEnabled) return res.status(404).json({ success: false, error: 'LAB_DISABLED' });
    if (!flags.paidGenerationEnabled) return res.status(403).json({ success: false, error: 'PAID_GENERATION_DISABLED' });
    if (!getFalKey().trim()) return res.status(503).json({ success: false, error: 'FAL_KEY_MISSING' });
    next();
  };

  router.get('/config', (req, res) => {
    const flags = resolveVisualStyleLabFlags();
    const library = loadPresetLibrary();
    res.json({
      success: true,
      ...flags,
      models: { initial: 'fal-ai/nano-banana-pro/edit', finish: 'bytedance/seedream/v5/pro/edit' },
      styles: library.styles.map((style) => ({
        id: style.id,
        name: style.name,
        scenes: style.scenes.map(({ id, index, name }) => ({ id, index, name })),
      })),
    });
  });

  router.post('/dry-run', requireLab, (req, res) => {
    try {
      res.json({ success: true, preview: dryRun(req.body || {}) });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Dry Run gagal.' });
    }
  });

  router.post('/generate', requirePaid, async (req, res) => {
    try {
      res.json({ success: true, results: await generateStyle(runner, req.body || {}) });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Generate 5 gagal.' });
    }
  });

  router.post('/retry', requirePaid, async (req, res) => {
    try {
      res.json({ success: true, result: await retryScene(runner, req.body || {}) });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Retry gagal.' });
    }
  });

  router.post('/finish', requirePaid, async (req, res) => {
    try {
      res.json({ success: true, result: await finishImage(runner, req.body || {}) });
    } catch (error) {
      res.status(400).json({ success: false, error: error instanceof Error ? error.message : 'Film Finish gagal.' });
    }
  });

  return router;
}
