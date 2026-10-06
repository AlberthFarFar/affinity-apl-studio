import { ProjectData } from '../types';

export interface SamplePreset {
  id: string;
  title: string;
  subtitle: string;
  project: ProjectData;
  description: string;
}

export const SAMPLE_PRESETS: SamplePreset[] = [
  {
    id: 'podomoro-akasia',
    title: 'Parkland Podomoro Karawang — Akasia Emory',
    subtitle: 'Cluster Hunian Keluarga Bernuansa Resort',
    description: 'Fasad Modern Kontemporer 2 Lantai dengan aksen kayu alami, balkon kaca, dan jalan lingkungan aspal rapi.',
    project: {
      name: 'Parkland Podomoro',
      type: 'Akasia Emory Cluster (Tipe 6x15)',
      price: 'Mulai Rp 850 Juta',
      location: 'Karawang Barat, Jawa Barat',
      features: 'Free PPN 100%, Serah Terima 2026, Club House Mewah, Danau Tematik, Smart Home System',
      style: 'lifestyle',
      developer: 'Agung Podomoro Land',
      contactPhone: '0822-8988-3888',
      website: 'www.parklandpodomoro.com',
    },
  },
  {
    id: 'kota-kertabumi',
    title: 'Kota Kertabumi — Klaster Avisha & Amara',
    subtitle: 'Hunian Premium Urban Resort di Jantung Kota',
    description: 'Arsitektur Neoklasik Modern & Tropical Minimalis dengan lanskap hijau asri dan fasilitas clubhouse eksklusif.',
    project: {
      name: 'Kota Kertabumi',
      type: 'Tipe Avisha Executive',
      price: 'Mulai Rp 1,2 Milyar',
      location: 'Pusat Kota Karawang',
      features: 'Free BPHTB & AJB, Underground Utilities, Taman Komunitas, Kolam Renang Olympic',
      style: 'professional',
      developer: 'Agung Podomoro Land',
      contactPhone: '0811-9460-988',
      website: 'www.kotakertabumi.com',
    },
  },
];
