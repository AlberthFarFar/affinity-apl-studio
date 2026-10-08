import assert from 'node:assert/strict';
import test from 'node:test';
import { callGPTViaFal } from './falOpenRouter.ts';
import { AIServiceError } from './aiErrors.ts';

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

test('access, credit, and rate-limit errors are never automatically retried or leaked', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [status, code, detail] of [
      [401, 'AI_AUTH_ERROR', 'Invalid credentials secret-key'],
      [402, 'AI_INSUFFICIENT_CREDITS', 'No credits secret-key'],
      [403, 'AI_PROVIDER_POLICY_BLOCKED', 'Policy Violation: this user has been blocked for a previous policy violation. secret-key'],
      [403, 'AI_PROVIDER_FORBIDDEN', 'Forbidden secret-key'],
      [429, 'AI_RATE_LIMIT', 'Rate limit secret-key'],
    ] as const) {
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return new Response(JSON.stringify({ detail }), { status, headers: { 'x-fal-request-id': 'req-123' } });
      };
      await assert.rejects(callGPTViaFal({ apiKey: 'secret-key', messages: [] }), (error: unknown) => {
        assert.ok(error instanceof AIServiceError);
        assert.equal(error.status, status);
        assert.equal(error.code, code);
        assert.equal(error.requestId, 'req-123');
        assert.doesNotMatch(error.message, /secret-key/);
        return true;
      });
      assert.equal(calls, 1);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('temporary upstream failure can recover with one retry', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async (_url, init) => {
    assert.ok(init?.signal);
    return ++calls === 1
      ? new Response('<html>gateway failure</html>', { status: 503 })
      : Response.json({ choices: [{ message: { content: 'recovered' } }] });
  };
  try {
    assert.equal(await callGPTViaFal({ apiKey: 'test', messages: [] }), 'recovered');
    assert.equal(calls, 2);
  } finally { globalThis.fetch = originalFetch; }
});

test('embedded provider errors, HTML responses, and timeouts remain distinct', async () => {
  const originalFetch = globalThis.fetch;
  try {
    for (const [reply, code] of [
      [() => Response.json({ error: { code: 403, message: 'Policy Violation' } }), 'AI_PROVIDER_POLICY_BLOCKED'],
      [() => new Response('<html>Forbidden</html>', { status: 403 }), 'AI_PROVIDER_FORBIDDEN'],
      [() => new Response('<html>app shell</html>'), 'AI_INVALID_RESPONSE'],
      [() => { throw new DOMException('Timed out', 'TimeoutError'); }, 'AI_TIMEOUT'],
    ] as const) {
      let calls = 0;
      globalThis.fetch = async () => { calls++; return reply(); };
      await assert.rejects(callGPTViaFal({ apiKey: 'test', messages: [] }), (error: unknown) => {
        assert.ok(error instanceof AIServiceError);
        assert.equal(error.code, code);
        return true;
      });
      assert.equal(calls, 1);
    }
  } finally { globalThis.fetch = originalFetch; }
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
