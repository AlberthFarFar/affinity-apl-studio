import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeProjectIntelligence } from './projectIntelligence.ts';
import type { FalOpenRouterParams } from './falOpenRouter.ts';

const validResponse = JSON.stringify({
  project: { name: 'Emory' },
  identityMatch: { projectMatch: 90 },
  facts: [],
  visualDNA: {
    materials: [],
    primaryAnchors: [],
    secondaryAnchors: [],
    mustPreserve: [],
    flexibleElements: [],
    nonEssentialElements: [],
  },
  observations: [],
  inferences: [],
  sources: [],
});

test('Project Intelligence uses a direct GPT-5 request and keeps URLs as unread references', async () => {
  let request: FalOpenRouterParams | undefined;
  const result = await analyzeProjectIntelligence({
    projectName: 'Emory',
    urls: ['https://www.parklandpodomoro.com/'],
    discover: false,
  }, {
    apiKey: 'fal-test-key',
    requester: async (params) => {
      request = params;
      return validResponse;
    },
  });

  assert.equal(result.project.name, 'Emory');
  assert.equal(request?.apiKey, 'fal-test-key');
  assert.equal(request?.model, 'openai/gpt-5');
  assert.equal(request?.responseFormatJson, true);
  assert.equal(request?.tools, undefined);
  assert.match(String(request?.messages[1].content), /do not browse, fetch, search/i);
  assert.match(String(request?.messages[1].content), /https:\/\/www\.parklandpodomoro\.com/);
});

test('broader concept draft also remains a direct GPT request', async () => {
  let request: FalOpenRouterParams | undefined;
  await analyzeProjectIntelligence({ projectName: 'Emory', discover: true }, {
    requester: async (params) => {
      request = params;
      return validResponse;
    },
  });

  assert.equal(request?.tools, undefined);
  assert.match(String(request?.messages[1].content), /broader concept draft/i);
});

test('Project Intelligence reports invalid GPT JSON clearly', async () => {
  await assert.rejects(
    analyzeProjectIntelligence({ projectName: 'Emory' }, { requester: async () => '<html>' }),
    /GPT fal\.ai tidak mengembalikan JSON/,
  );
});
