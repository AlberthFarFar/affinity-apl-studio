import assert from 'node:assert/strict';
import test from 'node:test';
import { readProjectIntelligenceResponse } from './projectIntelligenceApi.ts';

test('JSON errors survive a changed content-type from preview proxy', async () => {
  const response = new Response(JSON.stringify({ success: false, error: 'Akses dibatasi oleh penyedia AI.', code: 'AI_PROVIDER_POLICY_BLOCKED' }), { status: 403, headers: { 'Content-Type': 'text/plain' } });
  await assert.rejects(readProjectIntelligenceResponse(response), /Akses dibatasi oleh penyedia AI/);
});

test('HTML and malformed JSON show HTTP-specific guidance without echoing HTML', async () => {
  for (const status of [403, 404, 502, 503, 504]) {
    await assert.rejects(readProjectIntelligenceResponse(new Response('<html>private gateway details</html>', { status })), (error: Error) => {
      assert.doesNotMatch(error.message, /private|<html>/);
      assert.match(error.message, status === 404 ? /server aplikasi/ : new RegExp(`HTTP ${status}`));
      return true;
    });
  }
  await assert.rejects(readProjectIntelligenceResponse(new Response('{', { headers: { 'Content-Type': 'application/json' } })), /Respons API tidak sesuai format/);
  await assert.rejects(readProjectIntelligenceResponse(Response.json({ success: true })), /Respons API tidak sesuai format/);
});
