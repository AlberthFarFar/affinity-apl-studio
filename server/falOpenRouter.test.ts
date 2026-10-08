import assert from 'node:assert/strict';
import test from 'node:test';
import { callGPTViaFal } from './falOpenRouter.ts';

test('fal OpenRouter request sends GPT model, JSON mode, tools, and server-side key', async () => {
  const originalFetch = globalThis.fetch;
  let receivedUrl = '';
  let receivedInit: RequestInit | undefined;
  globalThis.fetch = async (input, init) => {
    receivedUrl = String(input);
    receivedInit = init;
    return new Response(JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  try {
    const content = await callGPTViaFal({
      apiKey: 'secret-key',
      model: 'openai/gpt-5',
      responseFormatJson: true,
      tools: [{ type: 'openrouter:web_search' }],
      messages: [{ role: 'user', content: 'Analyze' }],
    });
    assert.equal(content, '{"ok":true}');
    assert.equal(receivedUrl, 'https://fal.run/openrouter/router/openai/v1/chat/completions');
    assert.equal(new Headers(receivedInit?.headers).get('Authorization'), 'Key secret-key');
    const body = JSON.parse(String(receivedInit?.body));
    assert.equal(body.model, 'openai/gpt-5');
    assert.deepEqual(body.response_format, { type: 'json_object' });
    assert.deepEqual(body.tools, [{ type: 'openrouter:web_search' }]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fal OpenRouter requires FAL_KEY', async () => {
  const previousKey = process.env.FAL_KEY;
  delete process.env.FAL_KEY;
  try {
    await assert.rejects(
      callGPTViaFal({ messages: [{ role: 'user', content: 'Analyze' }] }),
      /FAL_KEY belum dikonfigurasi/,
    );
  } finally {
    if (previousKey === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = previousKey;
  }
});
