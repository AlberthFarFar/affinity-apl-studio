import { callGPTViaFal, type FalOpenRouterParams } from './falOpenRouter.ts';
import { sanitizeProjectIntelligence } from '../src/utils/projectIntelligence.ts';
import type { ProjectIntelligenceInput } from '../src/types/projectIntelligence.ts';

const schema = `Return ONLY valid JSON matching this shape: {project:{name,developer?,cluster?,unitType?,propertyType?},identityMatch:{projectMatch:number,clusterMatch?:number,unitMatch?:number},facts:[{statement:string,sourceUrl?:string,confidence:"high"|"medium"|"low"}],visualDNA:{architecturalCharacter?,massing?,facadeComposition?,roofCharacter?,openings?,materials:string[],primaryAnchors:string[],secondaryAnchors:string[],mustPreserve:string[],flexibleElements:string[],nonEssentialElements:string[]},environment?:{landscapeCharacter?,roadCharacter?,vegetation?,neighborhoodDensity?,siteCharacter?},observations:string[],inferences:string[],sources:[{url:string,title?,sourceType:"official"|"official-social"|"news"|"property-portal"|"brochure"|"secondary"|"unknown",confidence:"high"|"medium"|"low",usageRole:"structural_reference"|"visual_style_reference"|"environment_reference"|"brand_reference"|"information_only"|"rejected",projectMatch?:number,clusterMatch?:number,unitMatch?:number}],warnings?:string[]}`;

type FalRequester = (params: FalOpenRouterParams) => Promise<string>;

export interface ProjectIntelligenceOptions {
  apiKey?: string;
  requester?: FalRequester;
}

/**
 * This route intentionally uses a direct GPT completion. The fal/OpenRouter
 * server tools return 403 in the affected project flow even though direct GPT
 * completions pass the in-app diagnostic. URLs are source references only.
 */
export async function analyzeProjectIntelligence(input: ProjectIntelligenceInput, options: ProjectIntelligenceOptions = {}) {
  const urls = (input.urls || []).filter((url) => /^https?:\/\//i.test(url)).slice(0, 5);
  const sourceList = urls.length
    ? `Provided source references (unread; never claim their contents were fetched):\n${urls.map((url) => `- ${url}`).join('\n')}`
    : 'No source reference was supplied.';
  const mode = input.discover
    ? 'Create a broader concept draft from the supplied project identity only; label uncertain ideas as inferences.'
    : 'Create a focused concept draft from the supplied project identity only.';
  const instruction = `Analyze the requested real-estate identity: project="${input.projectName}", cluster="${input.clusterName || 'not supplied'}", unit="${input.unitType || 'not supplied'}".

${mode}
${sourceList}

Rules: do not browse, fetch, search, or claim to have visited any URL. Never invent facts. Only include a FACT when it is explicitly present in the input; otherwise use OBSERVATIONS or INFERENCES and give low confidence. Include supplied URLs in sources as information_only with low confidence, unless no URLs exist. Favor a useful architectural concept from the project, cluster, and unit names. Score project/cluster/unit matches 0-100 independently. A mismatched unit must never be structural_reference. Preserve identity anchors but do not instruct copying the exact photograph. ${schema}`;
  const requester = options.requester || callGPTViaFal;
  const text = await requester({
    apiKey: options.apiKey,
    model: 'openai/gpt-5',
    responseFormatJson: true,
    messages: [
      {
        role: 'system',
        content: 'You are Affinity Project Intelligence. Create a research-ready property concept without browsing. Return only valid JSON.',
      },
      { role: 'user', content: instruction },
    ],
  });
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('GPT fal.ai tidak mengembalikan JSON Project Intelligence yang valid.'); }
  return sanitizeProjectIntelligence(parsed, input);
}
