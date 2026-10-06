import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Step1Input } from './components/Step1Input';
import { Step2Master } from './components/Step2Master';
import { Step3Carousel } from './components/Step3Carousel';
import { Step4Video } from './components/Step4Video';
import { Step5Caption } from './components/Step5Caption';
import { DiagnosticModal } from './components/DiagnosticModal';
import {
  BlueprintSlide,
  CaptionsData,
  MasterAnalysis,
  ProjectData,
  UGCPack,
  PropertyReferenceMeta,
} from './types';
import { SAMPLE_PRESETS } from './utils/presets';
import {
  getStoredPropertyMeta,
  saveStoredPropertyMeta,
  incrementReferenceVersion,
} from './utils/projectStorage';
import { ShieldCheck, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [diagnosticModalOpen, setDiagnosticModalOpen] = useState<boolean>(false);

  // Property Project State initialized with default Podomoro Akasia
  const [project, setProject] = useState<ProjectData>(SAMPLE_PRESETS[0].project);

  // Separated Image References
  const [propertyImages, setPropertyImages] = useState<string[]>([]);
  const [styleImages, setStyleImages] = useState<string[]>([]);
  const [talentImage, setTalentImage] = useState<string | null>(null);
  const [logoImage, setLogoImage] = useState<string | null>(null);

  // Master Property Analysis & Locking
  const [masterAnalysis, setMasterAnalysis] = useState<MasterAnalysis | null>(null);
  const [masterLocked, setMasterLocked] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  // Architectural Consistency Guard Meta State
  const [propertyMeta, setPropertyMeta] = useState<PropertyReferenceMeta>(() =>
    getStoredPropertyMeta(project.name || 'Akasia Emory', '')
  );

  // Carousel Blueprints & Outputs
  const [blueprints, setBlueprints] = useState<BlueprintSlide[]>([]);
  const [scenes, setScenes] = useState<{ [index: number]: string }>({});
  const [renderedPosters, setRenderedPosters] = useState<{ [index: number]: string }>({});

  // Video Prompts & Captions
  const [ugcPack, setUgcPack] = useState<UGCPack | null>(null);
  const [captions, setCaptions] = useState<CaptionsData | null>(null);

  // Global Alert
  const [globalError, setGlobalError] = useState<string | null>(null);

  // Pre-load a pristine default facade mock for initial experience
  useEffect(() => {
    // Generate a default facade reference so user can test right away
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, 800);
      sky.addColorStop(0, '#0284c7');
      sky.addColorStop(0.5, '#7dd3fc');
      sky.addColorStop(1, '#e0f2fe');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 1080, 800);

      // Sun flare
      ctx.beginPath();
      ctx.arc(880, 240, 110, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(254, 240, 138, 0.7)';
      ctx.fill();

      // Asphalt Road
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 820, 1080, 530);

      // Grass & sidewalk
      ctx.fillStyle = '#15803d';
      ctx.fillRect(0, 770, 1080, 60);

      // House Facade (Akasia Emory 2-Story)
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(160, 310, 760, 480);

      // Warm Wood Siding Accent
      ctx.fillStyle = '#9a3412';
      ctx.fillRect(560, 310, 300, 260);

      // Balcony
      ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
      ctx.fillRect(540, 480, 340, 100);
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 3;
      ctx.strokeRect(540, 480, 340, 100);

      // Windows
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(220, 370, 190, 170);
      ctx.fillRect(220, 590, 150, 180);

      // Modern Solid Door
      ctx.fillStyle = '#78350f';
      ctx.fillRect(430, 580, 130, 190);

      // Carport Canopy
      ctx.fillStyle = '#334155';
      ctx.fillRect(580, 580, 320, 25);

      // Frame outline
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 4;
      ctx.strokeRect(160, 310, 760, 480);

      const defaultFacade = canvas.toDataURL('image/jpeg', 0.92);
      setPropertyImages([defaultFacade]);
    }
  }, []);

  // Action: Step 1 -> Step 2 (VLM Analyze Master Property)
  const handleAnalyzeAndProceed = async () => {
    if (propertyImages.length === 0) {
      setGlobalError('Minimal satu Foto Fasad (Ref. Properti) wajib diunggah.');
      return;
    }

    setIsAnalyzing(true);
    setGlobalError(null);

    try {
      const res = await fetch('/api/analyze-master', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyImage: propertyImages[0],
          project,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menganalisis master properti');
      }

      setMasterAnalysis(json.analysis || json.data);
      setCurrentStep(2);
    } catch (err: any) {
      console.warn('API analysis fallback triggered:', err?.message);
      // Fallback analysis to not block user
      setMasterAnalysis({
        property_identity: project?.name || 'Hunian Modern Tropis',
        architectural_style: 'Modern Tropical Contemporary',
        target_audience: 'Keluarga muda mapan & profesional',
        property_usp: ['Desain Fasad Ikonik', 'Ventilasi Silang Alami', 'Ruang Keluarga Lapang', 'Kawasan Hijau Asri'],
        facade_lock: {
          immutable_features: [
            'Footprint & massa bangunan 2 lantai dan proporsi kubus arsitektur',
            'Posisi bukaan jendela lantai atas, jendela sudut bawah, dan pintu utama',
            'Elevasi atap pelana modern dan tritisan kanopi carport',
            'Panel aksen kayu vertikal pada dinding lantai 2',
            'Garis batas carport dan pedestrian paving teras depan',
          ],
          editable_environment_features: [
            'Pencahayaan atmosferik (Golden hour, sinar keemasan, atau pagi cerah)',
            'Kondisi langit sinematik dan formasi awan berkarakter',
            'Keberadaan talent keluarga muda / anak-anak berinteraksi alami',
            'Kendaraan modern di area jalan depan rumah',
            'Tanaman hias lanskap dan bunga dekorasi taman',
          ],
        },
        visual_style: 'Cinematic Editorial Real Estate',
        brand_tone: 'Prestigious & Warm',
        campaign_angle: 'Kenyamanan hidup keluarga modern di hunian bernilai tinggi',
        locked: [
          'Siluet bentuk massa bangunan 2 lantai dan proporsi kubus arsitektur',
          'Posisi bukaan jendela lantai atas, jendela sudut bawah, dan pintu utama',
          'Elevasi atap pelana modern dan tritisan kanopi carport',
          'Panel aksen kayu vertikal pada dinding kanan lantai 2',
          'Garis batas carport dan pedestrian paving teras depan',
        ],
        flexible: [
          'Pencahayaan atmosferik (Golden hour, sinar keemasan, atau pagi cerah)',
          'Kondisi langit sinematik dan formasi awan berkarakter',
          'Keberadaan talent keluarga muda / anak-anak berinteraksi alami',
          'Kendaraan modern di area jalan depan rumah',
          'Tanaman hias lanskap dan bunga dekorasi taman',
        ],
        architecturalSummary:
          'Hunian Modern Tropis 2 Lantai dengan perpaduan material dinding putih bersih dan panel aksen kayu alami bernuansa resort mewah.',
      });
      setCurrentStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Action: Step 2 -> Step 3 (Lock Master)
  const handleLockMaster = () => {
    setMasterLocked(true);
    setCurrentStep(3);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      {/* Top Navbar */}
      <Navbar
        currentStep={currentStep}
        onNavigate={(step) => setCurrentStep(step)}
        masterLocked={masterLocked}
        hasPropertyImage={propertyImages.length > 0}
        onOpenDiagnostics={() => setDiagnosticModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Global Error Banner if any */}
        {globalError && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{globalError}</span>
            </div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-rose-500 hover:text-rose-700 font-bold"
            >
              ×
            </button>
          </div>
        )}

        {/* STEP 1: Input Proyek */}
        {currentStep === 1 && (
          <Step1Input
            project={project}
            setProject={setProject}
            propertyImages={propertyImages}
            setPropertyImages={setPropertyImages}
            styleImages={styleImages}
            setStyleImages={setStyleImages}
            talentImage={talentImage}
            setTalentImage={setTalentImage}
            logoImage={logoImage}
            setLogoImage={setLogoImage}
            onAnalyzeAndProceed={handleAnalyzeAndProceed}
            isAnalyzing={isAnalyzing}
          />
        )}

        {/* STEP 2: Master Properti */}
        {currentStep === 2 && (
          <Step2Master
            analysis={masterAnalysis}
            propertyImage={propertyImages[0]}
            project={project}
            masterLocked={masterLocked}
            propertyMeta={propertyMeta}
            setPropertyMeta={setPropertyMeta}
            onLockMaster={handleLockMaster}
            onBack={() => setCurrentStep(1)}
          />
        )}

        {/* STEP 3: Carousel */}
        {currentStep === 3 && (
          <Step3Carousel
            project={project}
            masterAnalysis={masterAnalysis}
            propertyImage={propertyImages[0]}
            propertyImages={propertyImages}
            styleImage={styleImages[0] || null}
            talentImage={talentImage}
            logoImage={logoImage}
            blueprints={blueprints}
            setBlueprints={setBlueprints}
            scenes={scenes}
            setScenes={setScenes}
            renderedPosters={renderedPosters}
            setRenderedPosters={setRenderedPosters}
            propertyMeta={propertyMeta}
            setPropertyMeta={setPropertyMeta}
            onProceedToVideo={() => setCurrentStep(4)}
          />
        )}

        {/* STEP 4: UGC Script & Storyboard */}
        {currentStep === 4 && (
          <Step4Video
            project={project}
            masterAnalysis={masterAnalysis}
            masterLocked={masterLocked}
            ugcPack={ugcPack}
            setUgcPack={setUgcPack}
            onProceedToCaption={() => setCurrentStep(5)}
          />
        )}

        {/* STEP 5: Caption */}
        {currentStep === 5 && (
          <Step5Caption
            project={project}
            captions={captions}
            setCaptions={setCaptions}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <span className="font-semibold text-slate-700">Affinity — APL Frames &amp; Footage</span>
            <span>• Master Facade Protected</span>
          </div>
          <p className="text-slate-400">
            Powered by fal.ai Unified Pipeline (GPT-5 • Nano Banana Pro • Kling 3.0 Pro)
          </p>
        </div>
      </footer>
      {/* Global Diagnostic Modal for FAL_KEY and analyze-master verification */}
      <DiagnosticModal
        isOpen={diagnosticModalOpen}
        onClose={() => setDiagnosticModalOpen(false)}
      />
    </div>
  );
}
