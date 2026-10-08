import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzeProjectIntelligence, clearProjectIntelligenceCacheForTests } from './projectIntelligence.ts';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];
const htmlResponse = (html: string, init: ResponseInit = {}) => new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' }, ...init });
const validHtml = `<!doctype html><html><head><title>Residences Aurora</title><script type="application/ld+json">{
  "@type":"Product","name":"Residences Aurora","brand":{"name":"Developer Maju"},
  "model":"Tipe 45/90","address":{"streetAddress":"Jl. Anggrek 1","addressLocality":"Bandung","addressRegion":"Jawa Barat"},
  "offers":{"price":"850000000","priceCurrency":"IDR"},"amenityFeature":[{"name":"Club House"},{"name":"Keamanan 24 Jam"}]
}</script></head><body><nav>Menu iklan</nav><main><h1>Residences Aurora Tipe 45/90</h1><table><tr><th>Promo</th><td>DP 10% dan cicilan 24x.</td></tr></table><p>Hubungi 0812-3456-7890.</p></main><footer>Iklan</footer></body></html>`;

test.beforeEach(() => clearProjectIntelligenceCacheForTests());

test('HTML dan JSON-LD mengisi fakta properti dan data komersial tanpa AI', async () => {
  let calls = 0;
  const result = await analyzeProjectIntelligence({ projectName: 'Residences Aurora', unitType: 'Tipe 45/90', urls: ['https://example.test/unit'] }, undefined, {
    lookup: publicLookup,
    fetch: async () => { calls += 1; return htmlResponse(validHtml); },
    now: () => Date.parse('2026-10-08T00:00:00Z'),
  });
  assert.equal(calls, 1);
  assert.equal(result.autofill.name, 'Residences Aurora');
  assert.equal(result.autofill.type, 'Tipe 45/90');
  assert.equal(result.autofill.price, 'IDR 850000000');
  assert.equal(result.autofill.location, 'Jl. Anggrek 1, Bandung, Jawa Barat');
  assert.match(result.autofill.features || '', /Club House/);
  assert.equal(result.sources[0].fetchedAt, '2026-10-08T00:00:00.000Z');
  assert.ok(result.sources[0].evidence?.length);
});

test('satu URL gagal tetap mengembalikan hasil URL lain dan request selesai', async () => {
  const result = await analyzeProjectIntelligence({ projectName: 'Residences Aurora', urls: ['https://fail.test', 'https://ok.test'] }, undefined, {
    lookup: publicLookup,
    fetch: async (url) => String(url).includes('fail') ? new Response('error', { status: 504, headers: { 'content-type': 'text/html' } }) : htmlResponse(validHtml),
  });
  assert.equal(result.autofill.name, 'Residences Aurora');
  assert.equal(result.warnings?.length, 1);
});

test('fakta salah unit dan harga ambigu tidak diisi', async () => {
  const ambiguous = validHtml.replaceAll('Tipe 45/90', 'Tipe 90/120').replace('</main>', '<p>Harga mulai Rp 1 miliar. Harga Rp 1,2 miliar.</p></main>');
  const result = await analyzeProjectIntelligence({ projectName: 'Residences Aurora', unitType: 'Tipe 45/90', urls: ['https://example.test/other-unit'] }, undefined, {
    lookup: publicLookup, fetch: async () => htmlResponse(ambiguous),
  });
  assert.equal(result.autofill.type, undefined);
  assert.equal(result.autofill.price, undefined);
  assert.equal(result.autofill.features, undefined);
  assert.equal(result.identityMatch.unitMatch, 0);
});

test('URL internal dan redirect ke alamat privat ditolak tanpa fetch privat', async () => {
  let fetchCalls = 0;
  await assert.rejects(() => analyzeProjectIntelligence({ urls: ['http://127.0.0.1/admin'] }, undefined, {
    lookup: publicLookup, fetch: async () => { fetchCalls += 1; return htmlResponse(validHtml); },
  }), /Alamat internal/);
  assert.equal(fetchCalls, 0);

  clearProjectIntelligenceCacheForTests();
  await assert.rejects(() => analyzeProjectIntelligence({ urls: ['https://public.test'] }, undefined, {
    lookup: async (hostname) => hostname === 'public.test' ? [{ address: '93.184.216.34', family: 4 }] : [{ address: '10.0.0.2', family: 4 }],
    fetch: async () => { fetchCalls += 1; return new Response(null, { status: 302, headers: { location: 'http://internal.test/secret' } }); },
  }), /Alamat internal/);
  assert.equal(fetchCalls, 1);
});

test('request URL yang sama dideduplikasi dalam TTL cache', async () => {
  let calls = 0;
  const deps = { lookup: publicLookup, fetch: async () => { calls += 1; return htmlResponse(validHtml); }, now: () => 1000 };
  await Promise.all([
    analyzeProjectIntelligence({ urls: ['https://cache.test'] }, undefined, deps),
    analyzeProjectIntelligence({ urls: ['https://cache.test'] }, undefined, deps),
  ]);
  assert.equal(calls, 1);
});
