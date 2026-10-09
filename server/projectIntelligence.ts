import { GoogleGenAI } from '@google/genai';
import { sanitizeProjectIntelligence } from '../src/utils/projectIntelligence.ts';
import type { ProjectIntelligenceInput } from '../src/types/projectIntelligence.ts';

const schema = `Return ONLY valid JSON matching this shape: {project:{name,developer?,cluster?,unitType?,propertyType?},identityMatch:{projectMatch:number,clusterMatch?:number,unitMatch?:number},facts:[{statement:string,sourceUrl?:string,confidence:"high"|"medium"|"low"}],visualDNA:{architecturalCharacter?,massing?,facadeComposition?,roofCharacter?,openings?,materials:string[],primaryAnchors:string[],secondaryAnchors:string[],mustPreserve:string[],flexibleElements:string[],nonEssentialElements:string[]},environment?:{landscapeCharacter?,roadCharacter?,vegetation?,neighborhoodDensity?,siteCharacter?},observations:string[],inferences:string[],sources:[{url:string,title?,sourceType:"official"|"official-social"|"news"|"property-portal"|"brochure"|"secondary"|"unknown",confidence:"high"|"medium"|"low",usageRole:"structural_reference"|"visual_style_reference"|"environment_reference"|"brand_reference"|"information_only"|"rejected",projectMatch?:number,clusterMatch?:number,unitMatch?:number}],warnings?:string[]}`;

export async function analyzeProjectIntelligence(input: ProjectIntelligenceInput) {
  const apiKey = (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '').trim();
  if (!apiKey) throw new Error('GEMINI_API_KEY belum dikonfigurasi di server environment.');
  const urls = (input.urls || []).filter((url) => /^https?:\/\//i.test(url)).slice(0, 5);
  const query = [input.projectName, input.clusterName, input.unitType].filter(Boolean).join(' ');
  const instruction = `You are Affinity Project Intelligence for real estate. Understand architectural/product identity, not pixel-level replication. Analyze the requested identity: project="${input.projectName}", cluster="${input.clusterName || 'not supplied'}", unit="${input.unitType || 'not supplied'}".\n\nUse URL context for these public URLs when supplied: ${urls.join(', ') || 'none'}. ${input.discover ? `Use Google Search grounding to discover reputable public context for: ${query}.` : 'Do not invent search results.'}\n\nRules: never invent facts; keep FACTS explicit and source-attributable, OBSERVATIONS visual/physical, INFERENCES clearly interpretive. Favor official sources and brochures. Score project/cluster/unit matches 0-100 independently. A mismatched unit must never be structural_reference; it may only provide project/environment/style context. Reject conflicting/unreadable sources. Preserve identity anchors but do not instruct copying the exact photograph. Ignore generic marketing copy. ${schema}`;
  const ai = new GoogleGenAI({ apiKey });
  const tools: any[] = [];
  if (urls.length) tools.push({ urlContext: {} });
  if (input.discover || !urls.length) tools.push({ googleSearch: {} });
  const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: instruction, config: { tools, responseMimeType: 'application/json', temperature: 0.15 } });
  const text = response.text || '';
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('Gemini tidak mengembalikan JSON Project Intelligence yang valid.'); }
  return sanitizeProjectIntelligence(parsed, input);
}
