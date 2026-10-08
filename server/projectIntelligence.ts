import dns from 'node:dns/promises';
import net from 'node:net';
import { sanitizeProjectIntelligence } from '../src/utils/projectIntelligence.ts';
import type { ProjectIntelligenceInput, PropertyAutofill } from '../src/types/projectIntelligence.ts';

const MAX_URLS = 3;
const MAX_BYTES = 1_000_000;
const FETCH_TIMEOUT_MS = 3_500;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

type FetchLike = typeof fetch;
type Lookup = (hostname: string) => Promise<Array<{ address: string; family: number }>>;
export interface AnalyzeDependencies { fetch?: FetchLike; lookup?: Lookup; now?: () => number }
const cache = new Map<string, { expires: number; value: Promise<PageExtraction> }>();

interface PageExtraction { sourceUrl: string; fetchedAt: string; title?: string; text: string; jsonLd: any[] }

const normalize = (value: unknown) => typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
const decode = (value: string) => value
  .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)));
const stripTags = (value: string) => normalize(decode(value.replace(/<[^>]*>/g, ' ')));

function isPrivateAddress(address: string): boolean {
  const lower = address.toLowerCase().split('%')[0];
  if (lower === '::1' || lower === '::' || lower.startsWith('fc') || lower.startsWith('fd') || /^fe[89ab]/.test(lower)) return true;
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  const ipv4 = mapped || (net.isIP(lower) === 4 ? lower : '');
  if (!ipv4) return false;
  const [a, b] = ipv4.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
}

async function assertPublicUrl(rawUrl: string, lookup: Lookup): Promise<URL> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new Error(`URL tidak valid: ${rawUrl}`); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error(`URL publik HTTP/HTTPS diperlukan: ${rawUrl}`);
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || isPrivateAddress(hostname)) throw new Error(`Alamat internal tidak diizinkan: ${hostname}`);
  const addresses = await lookup(hostname);
  if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) throw new Error(`Alamat internal tidak diizinkan: ${hostname}`);
  return url;
}

async function fetchPublicHtml(rawUrl: string, deps: Required<AnalyzeDependencies>): Promise<PageExtraction> {
  let current = await assertPublicUrl(rawUrl, deps.lookup);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    for (let redirects = 0; redirects <= 3; redirects += 1) {
      const response = await deps.fetch(current, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'text/html,application/xhtml+xml' } });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location || redirects === 3) throw new Error('Redirect sumber terlalu banyak atau tidak valid.');
        current = await assertPublicUrl(new URL(location, current).toString(), deps.lookup);
        continue;
      }
      if (!response.ok) throw new Error(`Sumber merespons HTTP ${response.status}.`);
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) throw new Error('Sumber bukan halaman HTML.');
      if (Number(response.headers.get('content-length') || 0) > MAX_BYTES) throw new Error('Halaman sumber terlalu besar.');
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.byteLength > MAX_BYTES) throw new Error('Halaman sumber terlalu besar.');
      return parseHtml(new TextDecoder().decode(bytes), current.toString(), deps.now());
    }
    throw new Error('Redirect sumber tidak valid.');
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error('Sumber tidak merespons dalam 3,5 detik.');
    throw error;
  } finally { clearTimeout(timer); }
}

function parseHtml(html: string, sourceUrl: string, now: number): PageExtraction {
  const jsonLd: any[] = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(decode(match[1]).trim());
      if (Array.isArray(parsed)) jsonLd.push(...parsed); else if (Array.isArray(parsed?.['@graph'])) jsonLd.push(...parsed['@graph']); else jsonLd.push(parsed);
    } catch { /* Ignore malformed structured data and continue with HTML. */ }
  }
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].map(([tag]) => ({
    key: tag.match(/(?:name|property)=["']([^"']+)["']/i)?.[1]?.toLowerCase(),
    value: decode(tag.match(/content=["']([^"']*)["']/i)?.[1] || ''),
  }));
  const metaValue = (...keys: string[]) => normalize(meta.find((item) => item.key && keys.includes(item.key))?.value);
  const title = metaValue('og:title', 'twitter:title') || stripTags(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '');
  const cleaned = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(nav|footer|aside)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<!--([\s\S]*?)-->/g, ' ');
  const headingsAndTables = [...cleaned.matchAll(/<(h1|h2|h3|table|dl)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((match) => stripTags(match[2]));
  const bodyText = stripTags(cleaned);
  return { sourceUrl, fetchedAt: new Date(now).toISOString(), title, jsonLd, text: normalize([title, metaValue('description', 'og:description'), ...headingsAndTables, bodyText].filter(Boolean).join(' ')).slice(0, 30_000) };
}

function walkObjects(value: unknown, out: any[] = []): any[] {
  if (!value || typeof value !== 'object') return out;
  if (Array.isArray(value)) value.forEach((item) => walkObjects(item, out));
  else { out.push(value); Object.values(value).forEach((item) => walkObjects(item, out)); }
  return out;
}

function stringValue(value: any): string {
  if (typeof value === 'string' || typeof value === 'number') return normalize(String(value));
  if (Array.isArray(value)) return normalize(value.map(stringValue).filter(Boolean).join(', '));
  if (value && typeof value === 'object') return normalize([value.streetAddress, value.addressLocality, value.addressRegion, value.postalCode].filter(Boolean).join(', '));
  return '';
}

function findEvidence(text: string, value: string): string {
  const index = text.toLowerCase().indexOf(value.toLowerCase());
  if (index < 0) return value.slice(0, 220);
  return text.slice(Math.max(0, index - 60), Math.min(text.length, index + value.length + 100)).trim().slice(0, 260);
}

function pageToAutofill(page: PageExtraction, input: ProjectIntelligenceInput): { data: PropertyAutofill; evidence: string[]; identity: number; unitMatched: boolean } {
  const objects = page.jsonLd.flatMap((item) => walkObjects(item));
  const candidate = objects.find((item) => /Product|Residence|House|Apartment|Accommodation|RealEstate/i.test(stringValue(item?.['@type']))) || objects[0] || {};
  const pageLower = page.text.toLowerCase();
  const projectMatched = !input.projectName?.trim() || pageLower.includes(input.projectName.trim().toLowerCase());
  const requestedUnit = normalize(input.unitType || input.clusterName);
  const unitMatched = !requestedUnit || pageLower.includes(requestedUnit.toLowerCase());
  const detailsAllowed = projectMatched && unitMatched;
  const data: PropertyAutofill = {};
  const evidence: string[] = [];
  const put = (key: keyof PropertyAutofill, value: string) => { if (value) { data[key] = value; evidence.push(findEvidence(page.text, value)); } };

  const name = stringValue(candidate.name) || page.title || '';
  if (projectMatched) put('name', name);
  const developer = stringValue(candidate.brand?.name || candidate.manufacturer?.name || candidate.provider?.name || candidate.seller?.name || candidate.developer);
  if (projectMatched) put('developer', developer);
  const location = stringValue(candidate.address || candidate.location?.address || objects.find((item) => item.address)?.address);
  if (projectMatched) put('location', location);
  if (projectMatched) put('website', page.sourceUrl);

  if (detailsAllowed) {
    put('type', requestedUnit || stringValue(candidate.model || candidate.category));
    const offers = Array.isArray(candidate.offers) ? candidate.offers : candidate.offers ? [candidate.offers] : [];
    const offerPrices: string[] = [...new Set<string>(offers.map((offer: any) => {
      const amount = stringValue(offer.price || offer.lowPrice);
      const currency = stringValue(offer.priceCurrency);
      return amount ? normalize(`${currency} ${amount}`) : '';
    }).filter(Boolean))];
    const priceMentions = [...page.text.matchAll(/(?:mulai(?:\s+dari)?|start(?:ing)?\s+from|harga)\s*[:\-]?\s*((?:Rp|IDR|USD)\s*[\d.,]+\s*(?:juta|miliar|million|billion)?)/gi)].map((match) => normalize(match[0]));
    const uniquePrices = [...new Set([...offerPrices, ...priceMentions])];
    if (uniquePrices.length === 1) put('price', uniquePrices[0]);
    const amenities = objects.flatMap((item) => Array.isArray(item.amenityFeature) ? item.amenityFeature : []).map((item: any) => stringValue(item.name || item.value)).filter(Boolean);
    const featureSentences = page.text.split(/(?<=[.!?])\s+/).filter((sentence) => /fasilitas|promo|cicilan|uang muka|\bDP\b|club\s*house|keamanan|kolam|taman|USP|selling point/i.test(sentence)).map((sentence) => sentence.trim().slice(0, 180));
    put('features', [...new Set([...amenities, ...featureSentences])].slice(0, 8).join(', '));
    put('contactPhone', normalize(page.text.match(/(?:\+62|0)8[1-9][\d\s-]{7,13}\d/)?.[0]));
  }
  return { data, evidence: [...new Set(evidence)].slice(0, 8), identity: projectMatched ? 90 : 0, unitMatched };
}

async function cachedFetch(url: string, deps: Required<AnalyzeDependencies>): Promise<PageExtraction> {
  const existing = cache.get(url);
  const now = deps.now();
  if (existing && existing.expires > now) return existing.value;
  const value = fetchPublicHtml(url, deps).catch((error) => { cache.delete(url); throw error; });
  cache.set(url, { expires: now + CACHE_TTL_MS, value });
  return value;
}

export async function analyzeProjectIntelligence(input: ProjectIntelligenceInput, _configuredApiKey?: string, injected: AnalyzeDependencies = {}) {
  const deps: Required<AnalyzeDependencies> = {
    fetch: injected.fetch || fetch,
    lookup: injected.lookup || (async (hostname) => dns.lookup(hostname, { all: true, verbatim: true })),
    now: injected.now || Date.now,
  };
  const urls = [...new Set((input.urls || []).map((url) => url.trim()).filter(Boolean))].slice(0, MAX_URLS);
  if (!urls.length) throw new Error('Masukkan minimal satu URL sumber publik.');
  const settled = await Promise.allSettled(urls.map((url) => cachedFetch(url, deps)));
  const pages = settled.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []);
  const warnings = settled.flatMap((result, index) => result.status === 'rejected' ? [`${urls[index]}: ${String(result.reason?.message || result.reason)}`] : []);
  if (!pages.length) throw new Error(warnings.join(' | ') || 'Semua URL sumber gagal dibaca.');
  const extracted = pages.map((page) => ({ page, ...pageToAutofill(page, input) }));
  const autofill = extracted.reduce<PropertyAutofill>((merged, item) => ({ ...item.data, ...merged }), {});
  const bestIdentity = Math.max(...extracted.map((item) => item.identity));
  const raw = {
    project: { name: autofill.name || input.projectName || '', developer: autofill.developer, cluster: input.clusterName, unitType: input.unitType },
    identityMatch: { projectMatch: bestIdentity, clusterMatch: input.clusterName ? (extracted.some((item) => item.unitMatched) ? 90 : 0) : undefined, unitMatch: input.unitType ? (extracted.some((item) => item.unitMatched) ? 90 : 0) : undefined },
    facts: extracted.flatMap((item) => item.evidence.map((statement) => ({ statement, sourceUrl: item.page.sourceUrl, confidence: 'high' }))).slice(0, 12),
    visualDNA: { materials: [], primaryAnchors: [], secondaryAnchors: [], mustPreserve: [], flexibleElements: [], nonEssentialElements: [] },
    observations: [], inferences: [],
    sources: extracted.map((item) => ({ url: item.page.sourceUrl, title: item.page.title, sourceType: 'unknown', confidence: item.identity >= 80 ? 'high' : 'low', usageRole: item.identity >= 80 ? 'information_only' : 'rejected', projectMatch: item.identity, evidence: item.evidence, fetchedAt: item.page.fetchedAt })),
    warnings,
  };
  return { ...sanitizeProjectIntelligence(raw, input), autofill };
}

export function clearProjectIntelligenceCacheForTests() { cache.clear(); }
