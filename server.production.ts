// Production entrypoint used by AI Studio/Cloud Run after `npm run build`.
// Set the mode before loading server.ts so Express serves the built client
// instead of starting a nested Vite development server.
process.env.NODE_ENV = 'production';
await import('./server.ts');
