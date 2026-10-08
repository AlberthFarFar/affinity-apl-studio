import assert from 'node:assert/strict';
import test from 'node:test';
import { runFalPipelineDiagnostics } from './diagnostics.ts';

test('diagnostics reports provider policy block and skips the next billable test', async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.FAL_KEY;
  let calls = 0;
  process.env.FAL_KEY = 'test-secret';
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ error: { message: 'Policy Violation: this user has been blocked for a previous policy violation. test-secret' } }, { status: 403 });
  };
  try {
    const result = await runFalPipelineDiagnostics();
    assert.equal(result.overallStatus, 'FAIL');
    assert.equal(result.openRouter.code, 'AI_PROVIDER_POLICY_BLOCKED');
    assert.equal(result.analyzeMaster.tested, false);
    assert.match(result.openRouter.message, /HTTP 403/);
    assert.doesNotMatch(JSON.stringify(result), /test-secret/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.FAL_KEY;
    else process.env.FAL_KEY = originalKey;
  }
});
