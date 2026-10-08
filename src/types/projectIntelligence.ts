export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ProjectIntelligenceInput {
  projectName?: string;
  clusterName?: string;
  unitType?: string;
  urls?: string[];
  discover?: boolean;
}

export interface PropertyAutofill {
  name?: string;
  type?: string;
  price?: string;
  location?: string;
  features?: string;
  developer?: string;
  contactPhone?: string;
  website?: string;
}

export interface ProjectFact {
  statement: string;
  sourceUrl?: string;
  confidence: ConfidenceLevel;
}

export interface ProjectSource {
  url: string;
  title?: string;
  sourceType: 'official' | 'official-social' | 'news' | 'property-portal' | 'brochure' | 'secondary' | 'unknown';
  confidence: ConfidenceLevel;
  usageRole: 'structural_reference' | 'visual_style_reference' | 'environment_reference' | 'brand_reference' | 'information_only' | 'rejected';
  projectMatch?: number;
  clusterMatch?: number;
  unitMatch?: number;
  fetchedAt?: string;
  evidence?: string[];
}

export interface ProjectIntelligence {
  autofill?: PropertyAutofill;
  project: {
    name: string;
    developer?: string;
    cluster?: string;
    unitType?: string;
    propertyType?: string;
  };
  identityMatch: {
    projectMatch: number;
    clusterMatch?: number;
    unitMatch?: number;
    confidence: ConfidenceLevel;
  };
  facts: ProjectFact[];
  visualDNA: {
    architecturalCharacter?: string;
    massing?: string;
    facadeComposition?: string;
    roofCharacter?: string;
    openings?: string;
    materials: string[];
    primaryAnchors: string[];
    secondaryAnchors: string[];
    mustPreserve: string[];
    flexibleElements: string[];
    nonEssentialElements: string[];
  };
  environment?: {
    landscapeCharacter?: string;
    roadCharacter?: string;
    vegetation?: string;
    neighborhoodDensity?: string;
    siteCharacter?: string;
  };
  observations: string[];
  inferences: string[];
  sources: ProjectSource[];
  conciseGenerationContext: string;
  warnings?: string[];
}
