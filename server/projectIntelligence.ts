import { callGPTViaFal, type FalOpenRouterParams } from './falOpenRouter.ts';
import { sanitizeProjectIntelligence } from '../src/utils/projectIntelligence.ts';
import type { ProjectIntelligenceInput } from '../src/types/projectIntelligence.ts';

const schema = `Return ONLY valid JSON matching this shape: {project:{name,developer?,cluster?,unitType?,propertyType?},identityMatch:{projectMatch:number,clusterMatch?:number,unitMatch?:number},facts:[{statement:string,sourceUrl?:string,confidence:"high"|"medium"|"low"}],visualDNA:{architecturalCharacter?,massing?,facadeComposition?,roofCharacter?,openings?,materials:string[],primaryAnchors:string[],secondaryAnchors:string[],mustPreserve:string[],flexibleElements:string[],nonEssentialElements:string[]},environment?:{landscapeCharacter?,roadCharacter?,vegetation?,neighborhoodDensity?,siteCharacter?},observations:string[],inferences:string[],sources:[{url:string,title?,sourceType:"official"|"official-social"|"news"|"property-portal"|"brochure"|"secondary"|"unknown",confidence:"high"|"medium"|"low",usageRole:"structural_reference"|"visual_style_reference"|"environment_reference"|"brand_reference"|"information_only"|"rejected",projectMatch?:number,clusterMatch?:number,unitMatch?:number}],warnings?:string[]}`;

type FalRequester = (params: FalOpenRouterParams) => Promise<string>;

export interface ProjectIntelligenceOptions {
  apiKey?: string;
  requester?: FalRequester;
}

export async function analyzeProjectIntelligence(input: ProjectIntelligenceInput, options: ProjectIntelligenceOptions = {}) {
  const urls = (input.urls || []).filter((url) => /^https?:\/\//i.test(url)).slice(0, 5);
  const query = [input.projectName, input.clusterName, input.unitType].filter(Boolean).join(' ');
  const instruction = `Analyze the requested real-estate identity: project="${input.projectName}", cluster="${input.clusterName || 'not supplied'}", unit="${input.unitType || 'not supplied'}".\n\n${urls.length ? `Use web_fetch to inspect every supplied public URL before answering: ${urls.join(', ')}.` : ''} ${input.discover || !urls.length ? `Use web_search to discover reputable public context for: ${query}.` : 'Do not add sources beyond the supplied URLs.'}\n\nRules: never invent facts; keep FACTS explicit and source-attributable, OBSERVATIONS visual/physical, INFERENCES clearly interpretive. Favor official sources and brochures. Score project/cluster/unit matches 0-100 independently. A mismatched unit must never be structural_reference; it may only provide project/environment/style context. Reject conflicting/unreadable sources. Preserve identity anchors but do not instruct copying the exact photograph. Ignore generic marketing copy. ${schema}`;
  const tools: unknown[] = [];
  if (urls.length) tools.push({ type: 'openrouter:web_fetch' });
  if (input.discover || !urls.length) {
    tools.push({
      type: 'openrouter:web_search',
      parameters: { max_results: 5, max_total_results: 10, search_context_size: 'low' },
    });
  }
  const requester = options.requester || callGPTViaFal;
  const text = await requester({
    apiKey: options.apiKey,
    model: 'openai/gpt-5',
    responseFormatJson: true,
    tools,
    messages: [
      {
        role: 'system',
        content: 'You are Affinity Project Intelligence. Understand architectural and product identity, not pixel-level replication. Return only valid JSON.',
      },
      { role: 'user', content: instruction },
    ],
  });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('GPT fal.ai tidak mengembalikan JSON Project Intelligence yang valid.'); }
  return sanitizeProjectIntelligence(parsed, input);
}
