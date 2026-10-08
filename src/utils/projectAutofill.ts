import type { ProjectData } from '../types.ts';
import type { PropertyAutofill } from '../types/projectIntelligence.ts';

type AutofillField = keyof PropertyAutofill & keyof ProjectData;
const fields: AutofillField[] = ['name', 'type', 'price', 'location', 'features', 'developer', 'contactPhone', 'website'];

export function mergeEmptyProjectFields(current: ProjectData, incoming: PropertyAutofill): ProjectData {
  const next = { ...current };
  for (const field of fields) {
    const value = incoming[field];
    if (!current[field].trim() && typeof value === 'string' && value.trim()) next[field] = value.trim();
  }
  return next;
}

export function createLatestRequestGuard() {
  let latest = 0;
  return { begin() { latest += 1; return latest; }, isLatest(requestId: number) { return requestId === latest; } };
}
