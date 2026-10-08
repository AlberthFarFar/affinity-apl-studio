import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import express from 'express';
import {defineConfig, loadEnv, type Plugin} from 'vite';
import { createProjectIntelligenceRouter } from './server/projectIntelligenceRoute.ts';

function projectIntelligenceApi(apiKey: string): Plugin {
  const apiApp = express();
  apiApp.use('/api/project-intelligence', createProjectIntelligenceRouter({ apiKey }));
  return {
    name: 'affinity-project-intelligence-api',
    configureServer(server) {
      server.middlewares.use(apiApp as any);
    },
    configurePreviewServer(server) {
      server.middlewares.use(apiApp as any);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      projectIntelligenceApi(env.GEMINI_API_KEY || env.GOOGLE_API_KEY || ''),
      react(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        '@': import.meta.dirname,
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
