// ============================================================================
// ARCHITECTURAL CONSISTENCY GUARD — Storage & Version Persistence
// ============================================================================

import { PropertyReferenceMeta, createDefaultBuildingMask } from './architecturalGuard';
import { ProjectData, MasterAnalysis } from '../types';

export interface SlideVersionRecord {
  version: number;
  imageUrl: string;
  posterUrl?: string;
  guardMode: 'strict' | 'creative';
  guardStatus: 'PASS' | 'REJECT' | 'NEEDS_REVIEW' | 'NOT_VALIDATED';
  qaResult?: any;
  timestamp: string;
  note?: string;
}

const STORAGE_KEYS = {
  PROJECT: 'affinity_project_data',
  REFERENCE_META: 'affinity_property_reference_meta',
  REFERENCE_VERSION: 'affinity_property_ref_version',
  SLIDE_OUTPUT_VERSIONS: 'affinity_slide_output_versions',
  SLIDE_VERSION_HISTORY: 'affinity_slide_version_history',
  GUARD_MODE: 'affinity_guard_mode',
};

/**
 * Initializes or loads persistent Property Reference Meta
 */
export function getStoredPropertyMeta(
  projectId: string = 'prop_default',
  initialImage: string = ''
): PropertyReferenceMeta {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REFERENCE_META);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.propertyId === projectId) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('[Storage] Error reading property reference meta:', e);
  }

  // Create initial default meta
  const defaultMeta: PropertyReferenceMeta = {
    propertyId: projectId,
    referenceVersion: 1,
    originalImageUrl: initialImage,
    activeViewpoint: 'front_facade',
    architecturalElements: {
      storyCount: 2,
      massingShape: 'Kubus Modern 2 Lantai dengan kanopi carport terintegrasi',
      roofSilhouette: 'Pelana Modern Tropis dengan kemiringan tersembunyi',
      windowDoorArrangement: 'Pintu solid kayu utama di lantai 1; bukaan kaca vertikal lantai 2',
      columnsAndBalconies: 'Balkon lantai 2 dengan railing kaca & kanopi baja carport',
      materialsAndColors: 'Dinding plester putih, aksen panel kayu alam, kusen alumunium hitam',
      viewpointPerspective: 'Eye-level 35mm sudut normal depan rumah (Front Facade)',
    },
    protectedAreaMask: createDefaultBuildingMask(),
    editableAreas: [
      'Langit, awan, dan kondisi cuaca alami',
      'Pencahayaan sinar matahari dan bayangan tanah',
      'Lansekap tanaman hias dan rumput taman depan',
      'Talent manusia dan interaksi keluarga di halaman/teras',
      'Kendaraan modern di area carport/jalan',
      'Furniture luar ruangan yang dapat dipindahkan',
      'Grading warna fotografis tanpa distorsi objek fisik',
    ],
  };

  saveStoredPropertyMeta(defaultMeta);
  return defaultMeta;
}

/**
 * Saves Property Reference Meta to LocalStorage
 */
export function saveStoredPropertyMeta(meta: PropertyReferenceMeta): void {
  try {
    localStorage.setItem(STORAGE_KEYS.REFERENCE_META, JSON.stringify(meta));
    localStorage.setItem(STORAGE_KEYS.REFERENCE_VERSION, String(meta.referenceVersion));
  } catch (e) {
    console.warn('[Storage] Error saving property reference meta:', e);
  }
}

/**
 * Increments reference version when user updates or replaces the master reference photo
 */
export function incrementReferenceVersion(
  currentMeta: PropertyReferenceMeta,
  newOriginalImage: string,
  newAnalysis?: MasterAnalysis | null
): PropertyReferenceMeta {
  const updatedVersion = (currentMeta.referenceVersion || 1) + 1;

  const updatedMeta: PropertyReferenceMeta = {
    ...currentMeta,
    referenceVersion: updatedVersion,
    originalImageUrl: newOriginalImage,
    architecturalElements: {
      storyCount: newAnalysis?.facade_lock?.immutable_features?.find((f) => f.includes('lantai')) || currentMeta.architecturalElements.storyCount,
      massingShape: newAnalysis?.architectural_style || currentMeta.architecturalElements.massingShape,
      roofSilhouette: newAnalysis?.facade_lock?.immutable_features?.find((f) => f.toLowerCase().includes('atap')) || currentMeta.architecturalElements.roofSilhouette,
      windowDoorArrangement: newAnalysis?.facade_lock?.immutable_features?.find((f) => f.toLowerCase().includes('jendela') || f.toLowerCase().includes('pintu')) || currentMeta.architecturalElements.windowDoorArrangement,
      columnsAndBalconies: newAnalysis?.facade_lock?.immutable_features?.find((f) => f.toLowerCase().includes('balkon') || f.toLowerCase().includes('kolom')) || currentMeta.architecturalElements.columnsAndBalconies,
      materialsAndColors: newAnalysis?.facade_lock?.immutable_features?.find((f) => f.toLowerCase().includes('material') || f.toLowerCase().includes('kayu')) || currentMeta.architecturalElements.materialsAndColors,
      viewpointPerspective: currentMeta.architecturalElements.viewpointPerspective,
    },
    protectedAreaMask: currentMeta.protectedAreaMask || createDefaultBuildingMask(),
  };

  saveStoredPropertyMeta(updatedMeta);
  return updatedMeta;
}

/**
 * Slide output version tracking
 */
export function getSlideOutputVersions(): Record<number, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SLIDE_OUTPUT_VERSIONS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveSlideOutputVersion(slideIndex: number, version: number): void {
  try {
    const current = getSlideOutputVersions();
    current[slideIndex] = version;
    localStorage.setItem(STORAGE_KEYS.SLIDE_OUTPUT_VERSIONS, JSON.stringify(current));
  } catch (e) {
    console.warn('[Storage] Error saving slide output version:', e);
  }
}

/**
 * Full Slide Version History for undo / revert
 */
export function getSlideVersionHistory(slideIndex: number): SlideVersionRecord[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEYS.SLIDE_VERSION_HISTORY}_${slideIndex}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addSlideVersionRecord(slideIndex: number, record: SlideVersionRecord): void {
  try {
    const existing = getSlideVersionHistory(slideIndex);
    const filtered = existing.filter((r) => r.version !== record.version);
    filtered.push(record);
    localStorage.setItem(
      `${STORAGE_KEYS.SLIDE_VERSION_HISTORY}_${slideIndex}`,
      JSON.stringify(filtered)
    );
    saveSlideOutputVersion(slideIndex, record.version);
  } catch (e) {
    console.warn('[Storage] Error adding slide version record:', e);
  }
}
