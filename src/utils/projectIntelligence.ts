import type { ConfidenceLevel, ProjectIntelligence, ProjectSource } from '../types/projectIntelligence.ts';

const SOURCE_WEIGHT: Record<ProjectSource['sourceType'], number> = {
  official: 6, brochure: 5, 'official-social': 4, news: 3, 'property-portal': 2, secondary: 1, unknown: 0,
};

export function rankSources(sources: ProjectSource[]): ProjectSource[] {
  return [...sources].sort((a, b) => {
    const aScore = SOURCE_WEIGHT[a.sourceType] * 100 + (a.projectMatch || 0) + (a.clusterMatch || 0) + (a.unitMatch || 0);
    const bScore = SOURCE_WEIGHT[b.sourceType] * 100 + (b.projectMatch || 0) + (b.clusterMatch || 0) + (b.unitMatch || 0);
    return bScore - aScore;
  });
}

export function confidenceFromMatches(projectMatch: number, clusterMatch?: number, unitMatch?: number): ConfidenceLevel {
  const required = [projectMatch, clusterMatch, unitMatch].filter((value): value is number => typeof value === 'number');
  const score = required.length ? required.reduce((sum, value) => sum + value, 0) / required.length : projectMatch;
  return score >= 80 ? 'high' : score >= 55 ? 'medium' : 'low';
}

const list = (items: unknown, max = 8): string[] => Array.isArray(items)
  ? items.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max)
  : [];

export function buildConciseGenerationContext(intelligence: Pick<ProjectIntelligence, 'visualDNA' | 'environment'>): string {
  const dna = intelligence.visualDNA;
  const environment = intelligence.environment;
  const section = (label: string, values: string[]) => values.length ? `${label}:\n${values.map((value) => `- ${value}`).join('\n')}` : '';
  return [
    'PROPERTY VISUAL DNA',
    dna.architecturalCharacter ? `Architecture:\n${dna.architecturalCharacter}` : '',
    section('Preserve', list(dna.mustPreserve, 6)),
    section('Materials', list(dna.materials, 6)),
    section('Flexible', list(dna.flexibleElements, 6)),
    environment ? `Environment:\n${[environment.siteCharacter, environment.landscapeCharacter, environment.roadCharacter, environment.neighborhoodDensity].filter(Boolean).join('; ')}` : '',
  ].filter(Boolean).join('\n\n').slice(0, 3200);
}

export function sanitizeProjectIntelligence(raw: any, input: { projectName?: string; clusterName?: string; unitType?: string }): ProjectIntelligence {
  const identity = raw?.identityMatch || {};
  const projectMatch = Math.max(0, Math.min(100, Number(identity.projectMatch) || 0));
  const clusterMatch = input.clusterName ? Math.max(0, Math.min(100, Number(identity.clusterMatch) || 0)) : undefined;
  const unitMatch = input.unitType ? Math.max(0, Math.min(100, Number(identity.unitMatch) || 0)) : undefined;
  const visualDNA = raw?.visualDNA || {};
  const sources = rankSources((Array.isArray(raw?.sources) ? raw.sources : []).filter((source: any) => typeof source?.url === 'string').map((source: any) => ({
    ...source,
    sourceType: SOURCE_WEIGHT[source.sourceType as keyof typeof SOURCE_WEIGHT] === undefined ? 'unknown' : source.sourceType,
    confidence: ['high', 'medium', 'low'].includes(source.confidence) ? source.confidence : 'low',
    usageRole: ['structural_reference', 'visual_style_reference', 'environment_reference', 'brand_reference', 'information_only', 'rejected'].includes(source.usageRole) ? source.usageRole : 'information_only',
  })));
  const result: ProjectIntelligence = {
    project: { name: raw?.project?.name || input.projectName || '', developer: raw?.project?.developer, cluster: raw?.project?.cluster || input.clusterName, unitType: raw?.project?.unitType || input.unitType, propertyType: raw?.project?.propertyType },
    identityMatch: { projectMatch, clusterMatch, unitMatch, confidence: confidenceFromMatches(projectMatch, clusterMatch, unitMatch) },
    facts: (Array.isArray(raw?.facts) ? raw.facts : []).filter((fact: any) => typeof fact?.statement === 'string').slice(0, 12),
    visualDNA: {
      architecturalCharacter: visualDNA.architecturalCharacter,
      massing: visualDNA.massing,
      facadeComposition: visualDNA.facadeComposition,
      roofCharacter: visualDNA.roofCharacter,
      openings: visualDNA.openings,
      materials: list(visualDNA.materials), primaryAnchors: list(visualDNA.primaryAnchors), secondaryAnchors: list(visualDNA.secondaryAnchors),
      mustPreserve: list(visualDNA.mustPreserve), flexibleElements: list(visualDNA.flexibleElements), nonEssentialElements: list(visualDNA.nonEssentialElements),
    },
    environment: raw?.environment,
    observations: list(raw?.observations, 12),
    inferences: list(raw?.inferences, 12),
    sources,
    conciseGenerationContext: '',
    warnings: list(raw?.warnings, 6),
  };
  result.conciseGenerationContext = buildConciseGenerationContext(result);
  return result;
}
