import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import { createProjectIntelligenceRouter } from './projectIntelligenceRoute.ts';

async function withApi(
  analyze: (input: any) => Promise<unknown>,
  run: (baseUrl: string) => Promise<void>,
) {
  const app = express();
  app.use('/api/project-intelligence', createProjectIntelligenceRouter({ analyze }));
  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Test server gagal dimulai.');
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('Project Intelligence API returns JSON and normalized input', async () => {
  let received: any;
  await withApi(async (input) => {
    received = input;
    return { project: { name: input.projectName } };
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectName: '  Emory  ',
        clusterName: '  North  ',
        urls: ['https://example.com'],
        discover: true,
      }),
    });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /application\/json/);
    assert.deepEqual(await response.json(), {
      success: true,
      intelligence: { project: { name: 'Emory' } },
    });
  });
  assert.equal(received.projectName, 'Emory');
  assert.equal(received.clusterName, 'North');
  assert.equal(received.discover, true);
});

test('Project Intelligence API never returns HTML for validation failures', async () => {
  await withApi(async () => ({}), async (baseUrl) => {
    const invalidUrl = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Emory', urls: ['example.com'] }),
    });
    assert.equal(invalidUrl.status, 400);
    assert.match(invalidUrl.headers.get('content-type') || '', /application\/json/);
    assert.match((await invalidUrl.json()).error, /URL tidak valid/);

    const malformed = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{',
    });
    assert.equal(malformed.status, 400);
    assert.match(malformed.headers.get('content-type') || '', /application\/json/);
    assert.deepEqual(await malformed.json(), { success: false, error: 'Request JSON tidak valid.' });
  });
});
