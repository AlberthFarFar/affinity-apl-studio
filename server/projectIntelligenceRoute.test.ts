import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import { createProjectIntelligenceRouter, normalizeProjectUrl } from './projectIntelligenceRoute.ts';
import { analyzeProjectIntelligence } from './projectIntelligence.ts';
import { readProjectIntelligenceResponse, ProjectIntelligenceApiError } from '../src/utils/projectIntelligenceApi.ts';

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
    return { project: { name: input.projectName }, identityMatch: { projectMatch: 100 }, visualDNA: { materials: [], primaryAnchors: [] } };
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
      apiVersion: 1,
      intelligence: { project: { name: 'Emory' }, identityMatch: { projectMatch: 100 }, visualDNA: { materials: [], primaryAnchors: [] } },
    });
  });
  assert.equal(received.projectName, 'Emory');
  assert.equal(received.clusterName, 'North');
  assert.equal(received.discover, true);
});

test('Project Intelligence accepts a domain without a scheme and rejects unsafe URL credentials', async () => {
  assert.equal(normalizeProjectUrl('www.parklandpodomoro.com'), 'https://www.parklandpodomoro.com/');
  assert.equal(normalizeProjectUrl(' https://example.com/project '), 'https://example.com/project');
  assert.equal(normalizeProjectUrl('https://user:password@example.com'), null);
  assert.equal(normalizeProjectUrl('not a website'), null);

  let received: any;
  await withApi(async (input) => {
    received = input;
    return { project: { name: input.projectName }, identityMatch: { projectMatch: 100 }, visualDNA: { materials: [], primaryAnchors: [] } };
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Emory', urls: ['www.parklandpodomoro.com'] }),
    });
    assert.equal(response.status, 200);
  });
  assert.deepEqual(received.urls, ['https://www.parklandpodomoro.com/']);
});

test('upstream policy block reaches the browser as 403, not generic JSON or URL error', async () => {
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith('https://fal.run/')) {
      providerCalls++;
      return Response.json({ detail: 'Policy Violation: this user has been blocked for a previous policy violation. private-secret' }, {
        status: 403, headers: { 'x-fal-request-id': 'fal-policy-test' },
      });
    }
    return originalFetch(url, init);
  };
  try {
    await withApi((input) => analyzeProjectIntelligence(input, { apiKey: 'test-key' }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: 'Parkland Podomoro', clusterName: 'Emory', urls: ['https://www.parklandpodomoro.com/'] }),
      });
      assert.equal(response.status, 403);
      assert.match(response.headers.get('content-type') || '', /application\/json/);
      const payload = await response.clone().json();
      assert.equal(payload.retryable, false);
      assert.doesNotMatch(JSON.stringify(payload), /private-secret|test-key/);
      await assert.rejects(readProjectIntelligenceResponse(response), (error: unknown) => {
        assert.ok(error instanceof ProjectIntelligenceApiError);
        assert.equal(error.code, 'AI_PROVIDER_POLICY_BLOCKED');
        assert.equal(error.requestId, 'fal-policy-test');
        assert.match(error.message, /dukungan fal.ai/);
        return true;
      });
    });
    assert.equal(providerCalls, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('successful analysis passes from provider through API to browser', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => String(url).startsWith('https://fal.run/')
    ? Response.json({ choices: [{ message: { content: JSON.stringify({ project: { name: 'Parkland Podomoro' }, identityMatch: { projectMatch: 90 }, visualDNA: { materials: ['Stone'] } }) } }] })
    : originalFetch(url, init);
  try {
    await withApi((input) => analyzeProjectIntelligence(input, { apiKey: 'test-key' }), async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectName: 'Parkland Podomoro', discover: true }),
      });
      assert.equal(response.status, 200);
      const payload = await readProjectIntelligenceResponse(response);
      assert.equal(payload.intelligence.project.name, 'Parkland Podomoro');
      assert.deepEqual(payload.intelligence.visualDNA.materials, ['Stone']);
    });
  } finally { globalThis.fetch = originalFetch; }
});

test('Project Intelligence API never returns HTML for validation failures', async () => {
  await withApi(async () => ({}), async (baseUrl) => {
    const invalidUrl = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Emory', urls: ['not a website'] }),
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

test('Project Intelligence API exposes readiness and rejects incomplete success payloads', async () => {
  await withApi(async () => ({ project: { name: 'Emory' } }), async (baseUrl) => {
    const health = await fetch(`${baseUrl}/api/project-intelligence/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { success: true, service: 'project-intelligence', apiVersion: 1 });

    const incomplete = await fetch(`${baseUrl}/api/project-intelligence/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectName: 'Emory' }),
    });
    assert.equal(incomplete.status, 502);
    assert.equal((await incomplete.json()).code, 'AI_INVALID_RESPONSE');

    const missing = await fetch(`${baseUrl}/api/project-intelligence/missing`);
    assert.equal(missing.status, 404);
    assert.match(missing.headers.get('content-type') || '', /application\/json/);
    assert.equal((await missing.json()).code, 'API_ROUTE_NOT_FOUND');
  });
});
