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

test('Project Intelligence uses GPT-5 through fal.ai with URL fetch', async () => {
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
  assert.deepEqual(request?.tools, [{ type: 'openrouter:web_fetch' }]);
});

test('Project Intelligence enables fal/OpenRouter web search for discovery', async () => {
  let request: FalOpenRouterParams | undefined;
  await analyzeProjectIntelligence({ projectName: 'Emory', discover: true }, {
    requester: async (params) => {
      request = params;
      return validResponse;
    },
  });

  assert.deepEqual(request?.tools, [{
    type: 'openrouter:web_search',
    parameters: { max_results: 5, max_total_results: 10, search_context_size: 'low' },
  }]);
});

test('Project Intelligence reports invalid GPT JSON clearly', async () => {
  await assert.rejects(
    analyzeProjectIntelligence({ projectName: 'Emory' }, { requester: async () => '<html>' }),
    /GPT fal\.ai tidak mengembalikan JSON/,
  );
});
