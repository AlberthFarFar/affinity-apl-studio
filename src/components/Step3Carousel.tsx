import React, { useState, useEffect } from 'react';
import {
  Wand2,
  Sparkles,
  Layers,
  Download,
  Eye,
  Edit3,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  FileImage,
  ArrowRight,
  Sliders,
  Play,
  RotateCcw,
  Film,
  Video,
  X,
  VolumeX,
  Volume2,
  Clock,
  ShieldAlert,
  Crop,
  Lock,
  AlertTriangle,
  Split,
  History,
  SlidersHorizontal,
  ShieldCheck,
} from 'lucide-react';
import {
  BlueprintSlide,
  ProjectData,
  MasterAnalysis,
  AspectRatioOption,
  ResolutionOption,
  KlingAnimationConfig,
  VideoJobStatus,
  FacadeLockMode,
  ImageGenerationEngine,
  VisualQAResult,
  PropertyReferenceMeta,
  BuildingMask,
} from '../types';
import { createLockedFacadeCrop, CropPosition } from '../utils/cropUtils';
import { renderPosterToDataUrl } from '../utils/canvasRenderer';
import {
  getSlideOutputVersions,
  saveSlideOutputVersion,
  getSlideVersionHistory,
  addSlideVersionRecord,
  SlideVersionRecord,
} from '../utils/projectStorage';
import { ReviewModal } from './ReviewModal';
import { TextEditModal } from './TextEditModal';
import { DiagnosticModal } from './DiagnosticModal';

interface Step3CarouselProps {
  project: ProjectData;
  masterAnalysis: MasterAnalysis | null;
  propertyImage: string;
  propertyImages?: string[];
  styleImage: string | null;
  talentImage: string | null;
  logoImage: string | null;
  blueprints: BlueprintSlide[];
  setBlueprints: React.Dispatch<React.SetStateAction<BlueprintSlide[]>>;
  scenes: { [index: number]: string };
  setScenes: React.Dispatch<React.SetStateAction<{ [index: number]: string }>>;
  renderedPosters: { [index: number]: string };
  setRenderedPosters: React.Dispatch<React.SetStateAction<{ [index: number]: string }>>;
  propertyMeta?: PropertyReferenceMeta;
  setPropertyMeta?: React.Dispatch<React.SetStateAction<PropertyReferenceMeta>>;
  onProceedToVideo: () => void;
}

export const Step3Carousel: React.FC<Step3CarouselProps> = ({
  project,
  masterAnalysis,
  propertyImage,
  propertyImages = [],
  styleImage,
  talentImage,
  logoImage,
  blueprints,
  setBlueprints,
  scenes,
  setScenes,
  renderedPosters,
  setRenderedPosters,
  propertyMeta,
  setPropertyMeta,
  onProceedToVideo,
}) => {
  // Configuration States
  const [styleOption, setStyleOption] = useState('Mixed');
  const [castingOption, setCastingOption] = useState('Keluarga Muda');
  const [slideCount, setSlideCount] = useState(5);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('4:5');
  const [resolution, setResolution] = useState<ResolutionOption>('2K');

  // Requirement #2: Facade Cropping States (Prepare Facade for Selected Ratio)
  const [cropPosition, setCropPosition] = useState<CropPosition>('center');
  const [customCropOffset, setCustomCropOffset] = useState<number>(0.5);
  const [lockedFacadeUrl, setLockedFacadeUrl] = useState<string | null>(null);
  const [isCroppingFacade, setIsCroppingFacade] = useState(false);

  // Requirement #7: Facade Lock Mode ('strict' | 'creative')
  const [facadeMode, setFacadeMode] = useState<FacadeLockMode>('strict');

  // Requirement #11: Image Generation Engine ('nano-banana' | 'seedream')
  const [selectedEngine, setSelectedEngine] = useState<ImageGenerationEngine>('nano-banana');

  // Requirement #8: Visual QA Evaluation States
  const [visualQA, setVisualQA] = useState<{ [slideIndex: number]: VisualQAResult }>({});
  const [isCheckingQA, setIsCheckingQA] = useState<{ [slideIndex: number]: boolean }>({});
  const [stricterLockAttempts, setStricterLockAttempts] = useState<{ [slideIndex: number]: boolean }>({});

  // Loading & Progress States
  const [isGeneratingBlueprint, setIsGeneratingBlueprint] = useState(false);
  const [generatingSlideIndex, setGeneratingSlideIndex] = useState<number | null>(null);
  const [isRenderingAll, setIsRenderingAll] = useState(false);
  const [isTestingFal, setIsTestingFal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Modals state
  const [reviewIndex, setReviewIndex] = useState<number | null>(null);
  const [textEditIndex, setTextEditIndex] = useState<number | null>(null);
  const [promptEditIndex, setPromptEditIndex] = useState<number | null>(null);
  const [editedPromptText, setEditedPromptText] = useState('');
  const [confirmGenerateAll, setConfirmGenerateAll] = useState(false);
  const [versionHistorySlide, setVersionHistorySlide] = useState<number | null>(null);
  const [klingWarningSlide, setKlingWarningSlide] = useState<number | null>(null);
  const [showMaskEditor, setShowMaskEditor] = useState<boolean>(false);

  // Mask settings from propertyMeta
  const currentMask: BuildingMask = propertyMeta?.protectedAreaMask || {
    x: 12,
    y: 20,
    width: 76,
    height: 60,
    featherPx: 12,
    label: 'Protected Facade Zone',
  };

  const handleUpdateMask = (updates: Partial<BuildingMask>) => {
    if (!setPropertyMeta || !propertyMeta) return;
    const newMask = { ...currentMask, ...updates };
    setPropertyMeta({
      ...propertyMeta,
      protectedAreaMask: newMask,
    });
  };

  // Kling Animation Panel States
  const [activeKlingSlide, setActiveKlingSlide] = useState<number | null>(null);
  const [isDiagnosticOpen, setIsDiagnosticOpen] = useState(false);
  const [klingConfig, setKlingConfig] = useState<KlingAnimationConfig>({
    preset: 'Subtle Cinematic',
    duration: '5',
    audio: false,
    prompt: '',
  });
  const [videoJobs, setVideoJobs] = useState<{ [index: number]: VideoJobStatus }>({});

  // All reference images
  const allPropertyImages = [
    propertyImage,
    ...propertyImages.filter((img) => img !== propertyImage),
  ].filter(Boolean);

  // Requirement #2: Auto-generate deterministic locked facade crop
  useEffect(() => {
    let isCancelled = false;
    const computeCrop = async () => {
      const baseImg = propertyImage || (propertyImages.length > 0 ? propertyImages[0] : null);
      if (!baseImg) return;
      setIsCroppingFacade(true);
      try {
        const cropped = await createLockedFacadeCrop(
          baseImg,
          aspectRatio,
          cropPosition,
          customCropOffset
        );
        if (!isCancelled) {
          setLockedFacadeUrl(cropped);
        }
      } catch (err) {
        console.warn('Facade deterministic crop failed, using base:', err);
        if (!isCancelled) {
          setLockedFacadeUrl(baseImg);
        }
      } finally {
        if (!isCancelled) {
          setIsCroppingFacade(false);
        }
      }
    };

    computeCrop();
    return () => {
      isCancelled = true;
    };
  }, [propertyImage, propertyImages, aspectRatio, cropPosition, customCropOffset]);

  // 0. Test fal.ai Connection
  const handleTestFalConnection = async () => {
    setIsTestingFal(true);
    try {
      const res = await fetch('/api/fal/test-connection');
      const data = await res.json();
      if (res.ok && data.connected) {
        setStatusMessage({
          type: 'success',
          text: `fal.ai Terhubung (${data.model}): ${data.message}`,
        });
      } else {
        setStatusMessage({
          type: 'error',
          text: `Koneksi fal.ai Gagal: ${data.error || 'Periksa FAL_KEY di Secrets.'}`,
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: `Gagal memanggil endpoint test koneksi: ${err.message}`,
      });
    } finally {
      setIsTestingFal(false);
    }
  };

  // 1. Generate Blueprints via GPT-5 on fal.ai
  const handleGenerateBlueprint = async () => {
    setIsGeneratingBlueprint(true);
    setStatusMessage({ type: 'info', text: 'Menyusun blueprint editorial Instagram via GPT-5 (fal.ai)...' });

    try {
      const res = await fetch('/api/generate-blueprint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project,
          masterAnalysis,
          slideCount,
          visualStyle: styleOption,
          casting: castingOption,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const rawText = await res.text().catch(() => '');
        console.error('Unexpected API response for blueprint', {
          status: res.status,
          contentType,
          preview: rawText.slice(0, 300),
        });
        throw new Error('Backend mengembalikan respons yang tidak valid.');
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Gagal menghasilkan blueprint');
      }

      setBlueprints(json.slides);
      setStatusMessage({
        type: 'success',
        text: `Blueprint ${json.slides.length} slide berhasil dibuat oleh GPT-5. Silakan review sebelum generate gambar.`,
      });
    } catch (err: any) {
      console.error('Blueprint generation error:', err);
      setStatusMessage({
        type: 'error',
        text: `Gagal membuat blueprint: ${err.message}`,
      });
    } finally {
      setIsGeneratingBlueprint(false);
    }
  };

  // 2. Generate Single Slide with Nano Banana Pro Edit or Seedream 5 Pro
  const handleGenerateSingleScene = async (slideIdx: number, isStricterRegen: boolean = false) => {
    if (!blueprints[slideIdx]) return;
    const bp = blueprints[slideIdx];
    setGeneratingSlideIndex(slideIdx);

    if (isStricterRegen) {
      setStricterLockAttempts((prev) => ({ ...prev, [slideIdx]: true }));
    }

    const engineName = selectedEngine === 'seedream' ? 'Seedream 5 Pro Precision Edit' : 'Nano Banana Pro Edit';
    setStatusMessage({
      type: 'info',
      text: `${isStricterRegen ? '[Regenerasi Lebih Ketat] ' : ''}Menghasilkan gambar Slide ${slideIdx + 1} dengan ${engineName} (${facadeMode === 'strict' ? 'Strict Facade Lock' : 'Creative Edit'})...`,
    });

    try {
      const res = await fetch('/api/fal/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          masterAIImages: allPropertyImages,
          masterAIImage: propertyImage,
          // Full master remains Image 1. The crop is passed separately for framing only.
          lockedFacadeUrl,
          styleImages: styleImage ? [styleImage] : [],
          talentImage,
          aspectRatio,
          resolution,
          prompt: bp.nano_banana_prompt || bp.shot,
          scenePrompt: bp.scene_description || bp.shot,
          slideIndex: slideIdx,
          mode: facadeMode,
          engine: selectedEngine,
          isStricterRegen,
        }),
      });

      // Requirement #3: Check response status & content-type safely
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const rawText = await res.text().catch(() => '');
        const preview = rawText.slice(0, 300);
        console.error('Unexpected API response', {
          status: res.status,
          contentType,
          preview,
        });
        throw new Error('Backend mengembalikan respons yang tidak valid.');
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || json.error || 'Gagal menghasilkan gambar');
      }

      let finalImageUrl = json.imageUrl;

      // Do not overwrite the model output with pixels from the source facade.
      // That made paid generations look identical to the input and biased QA.
      // Strict mode is enforced by the request guard and independent QA below.

      setScenes((prev) => ({ ...prev, [slideIdx]: finalImageUrl }));

      // Render typography overlay via canvas
      const posterDataUrl = await renderPosterToDataUrl({
        sceneUrl: finalImageUrl,
        slide: bp,
        project,
        logoUrl: logoImage,
      });

      setRenderedPosters((prev) => ({ ...prev, [slideIdx]: posterDataUrl }));

      // Requirement #8: Visual QA Evaluation via OpenRouter Vision
      setIsCheckingQA((prev) => ({ ...prev, [slideIdx]: true }));
      let evaluatedQA: VisualQAResult | null = null;
      try {
        const qaRes = await fetch('/api/fal/visual-qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            referenceImageUrl: propertyImage,
            generatedImageUrl: finalImageUrl,
            referenceVersion: propertyMeta?.referenceVersion || 1,
          }),
        });
        const qaJson = await qaRes.json();
        if (qaJson.success && qaJson.qa) {
          evaluatedQA = qaJson.qa;
          setVisualQA((prev) => ({ ...prev, [slideIdx]: qaJson.qa }));

          if (!qaJson.qa.pass) {
            setStatusMessage({
              type: 'error',
              text: `Slide ${slideIdx + 1}: Fasad berubah dari referensi (Status: ${qaJson.qa.status || 'REJECT'}, Skor QA: ${qaJson.qa.overall_score}%). Jangan gunakan hasil ini.`,
            });
          } else {
            setStatusMessage({
              type: 'success',
              text: `Slide ${slideIdx + 1} berhasil dirender! Fasad terverifikasi identik (PASS - Skor QA: ${qaJson.qa.overall_score}%).`,
            });
          }
        }
      } catch (qaErr: any) {
        console.warn('Visual QA check failed:', qaErr);
      } finally {
        setIsCheckingQA((prev) => ({ ...prev, [slideIdx]: false }));
      }

      // Add to Version History
      const existingHistory = getSlideVersionHistory(slideIdx);
      const nextVer = existingHistory.length + 1;
      addSlideVersionRecord(slideIdx, {
        version: nextVer,
        imageUrl: finalImageUrl,
        posterUrl: posterDataUrl,
        guardMode: facadeMode,
        // Fail closed: a strict prompt is not evidence of a passed visual check.
        guardStatus: evaluatedQA?.status || 'NOT_VALIDATED',
        qaResult: evaluatedQA,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        note: isStricterRegen
          ? 'Regenerasi Lebih Ketat'
          : facadeMode === 'strict'
          ? 'Strict Preserve'
          : 'Creative Edit',
      });
    } catch (err: any) {
      console.error('Scene generation error:', err);
      setStatusMessage({
        type: 'error',
        text: `Gagal memproses Slide ${slideIdx + 1}: ${err.message}`,
      });
    } finally {
      setGeneratingSlideIndex(null);
    }
  };

  // 3. Batch Generate All Slides (With Cost Protection Confirmation)
  const handleExecuteGenerateAll = async () => {
    setConfirmGenerateAll(false);
    setStatusMessage({
      type: 'info',
      text: `Memulai generasi seluruh slide dengan Nano Banana Pro Edit (${resolution})...`,
    });

    for (let i = 0; i < blueprints.length; i++) {
      await handleGenerateSingleScene(i);
    }

    setStatusMessage({
      type: 'success',
      text: 'Semua slide carousel selesai diproses!',
    });
  };

  // 4. Render All Posters Typography Overlay
  const handleRenderAllPosters = async () => {
    setIsRenderingAll(true);
    try {
      const updated: { [index: number]: string } = {};
      for (const bp of blueprints) {
        const sceneUrl = scenes[bp.index] || propertyImage;
        const poster = await renderPosterToDataUrl({
          sceneUrl,
          slide: bp,
          project,
          logoUrl: logoImage,
        });
        updated[bp.index] = poster;
      }
      setRenderedPosters(updated);
      setStatusMessage({ type: 'success', text: 'Semua poster komposit tipografi berhasil diperbarui.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Gagal merender poster: ${err.message}` });
    } finally {
      setIsRenderingAll(false);
    }
  };

  // Revert slide output to a previous version
  const handleRevertSlideVersion = (slideIdx: number, rec: SlideVersionRecord) => {
    setScenes((prev) => ({ ...prev, [slideIdx]: rec.imageUrl }));
    if (rec.posterUrl) {
      setRenderedPosters((prev) => ({ ...prev, [slideIdx]: rec.posterUrl! }));
    }
    if (rec.qaResult) {
      setVisualQA((prev) => ({ ...prev, [slideIdx]: rec.qaResult }));
    }
    setVersionHistorySlide(null);
    setStatusMessage({
      type: 'info',
      text: `Slide ${slideIdx + 1} berhasil dikembalikan ke Versi ${rec.version} (${rec.guardStatus}).`,
    });
  };

  // 5. Kling 3.0 Pro Animation Handlers (Protected with Architectural Consistency Guard)
  const handleOpenKlingPanel = (slideIdx: number) => {
    const qa = visualQA[slideIdx];
    const isPass = qa?.pass;

    // Video is never sent to a paid model unless the source image has an
    // explicit Visual QA PASS. A strict prompt alone is insufficient proof.
    if (!isPass) {
      setKlingWarningSlide(slideIdx);
      return;
    }

    proceedToKlingPanel(slideIdx);
  };

  const proceedToKlingPanel = (slideIdx: number) => {
    const bp = blueprints[slideIdx];
    const defaultMotion = `Preserve the original building geometry and architectural identity from the reference image. The building must remain structurally stable throughout the entire shot. Zero morphing facade, zero window movement, no roof deformation, no structural changes. Allowed motion: subtle camera push, gentle tree foliage movement, ambient lighting.`;
    setKlingConfig({
      preset: 'Subtle Cinematic',
      duration: '5',
      audio: false,
      prompt: defaultMotion,
    });
    setActiveKlingSlide(slideIdx);
  };

  const handleTriggerKlingVideo = async () => {
    if (activeKlingSlide === null) return;
    const slideIdx = activeKlingSlide;
    const imgUrl = scenes[slideIdx];
    if (!imgUrl) return;

    setVideoJobs((prev) => ({
      ...prev,
      [slideIdx]: { status: 'Queued' },
    }));

    setStatusMessage({
      type: 'info',
      text: `Mengantrekan animasi Kling 3.0 Pro untuk Slide ${slideIdx + 1} (${klingConfig.duration}s)...`,
    });

    try {
      const res = await fetch('/api/animate-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: imgUrl,
          motionPreset: klingConfig.preset,
          duration: klingConfig.duration,
          audio: klingConfig.audio,
          customPrompt: klingConfig.prompt,
          slideIndex: slideIdx,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal memulai job Kling');
      }

      setVideoJobs((prev) => ({
        ...prev,
        [slideIdx]: {
          status: 'Queued',
          requestId: json.requestId,
        },
      }));

      // Start polling for this job
      pollKlingJob(slideIdx, json.requestId);
    } catch (err: any) {
      setVideoJobs((prev) => ({
        ...prev,
        [slideIdx]: { status: 'Failed', error: err.message },
      }));
      setStatusMessage({
        type: 'error',
        text: `Kling 3.0 Video gagal: ${err.message}`,
      });
    }
  };

  const pollKlingJob = async (slideIdx: number, requestId: string) => {
    const pollInterval = 4000;
    const maxPollTime = 300000; // 5 mins
    const startTime = Date.now();

    const intervalId = setInterval(async () => {
      if (Date.now() - startTime > maxPollTime) {
        clearInterval(intervalId);
        setVideoJobs((prev) => ({
          ...prev,
          [slideIdx]: { status: 'Failed', error: 'Batas waktu generasi video tercapai.' },
        }));
        return;
      }

      try {
        const res = await fetch(`/api/animate-slide/status/${requestId}`);
        const data = await res.json();

        if (data.status === 'Completed' && data.videoUrl) {
          clearInterval(intervalId);
          setVideoJobs((prev) => ({
            ...prev,
            [slideIdx]: {
              status: 'Completed',
              videoUrl: data.videoUrl,
              requestId,
            },
          }));
          setStatusMessage({
            type: 'success',
            text: `Video Kling 3.0 Pro untuk Slide ${slideIdx + 1} selesai dihasilkan!`,
          });
        } else if (data.status === 'Generating' || data.status === 'IN_PROGRESS') {
          setVideoJobs((prev) => ({
            ...prev,
            [slideIdx]: { status: 'Generating', requestId },
          }));
        } else if (data.status === 'Failed') {
          clearInterval(intervalId);
          setVideoJobs((prev) => ({
            ...prev,
            [slideIdx]: { status: 'Failed', error: data.error, requestId },
          }));
          setStatusMessage({
            type: 'error',
            text: `Kling video gagal: ${data.error}`,
          });
        }
      } catch (err) {
        console.warn('Polling error, retrying:', err);
      }
    }, pollInterval);
  };

  // 6. Downloads
  const handleDownloadClean = (idx: number) => {
    const url = scenes[idx];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'affinity'}-slide-${idx + 1}-clean.png`;
    a.click();
  };

  const handleDownloadPoster = (idx: number) => {
    const url = renderedPosters[idx];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name || 'affinity'}-slide-${idx + 1}-poster.png`;
    a.click();
  };

  const handleDownloadVideo = (idx: number) => {
    const job = videoJobs[idx];
    if (!job?.videoUrl) return;
    const a = document.createElement('a');
    a.href = job.videoUrl;
    a.download = `${project.name || 'affinity'}-slide-${idx + 1}-video.mp4`;
    a.target = '_blank';
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 text-xs sm:text-sm shadow-xs transition-all ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border border-rose-200'
              : 'bg-teal-50 text-teal-900 border border-teal-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />}
            {statusMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            {statusMessage.type === 'info' && <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Control Bar: Carousel Directives & fal.ai Configuration */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              Konfigurasi Carousel &amp; Nano Banana Pro Edit
            </h3>
            <p className="text-xs text-slate-500">
              Format editorial periklanan real estate dengan fasad master terkunci 100%
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDiagnosticOpen(true)}
              className="text-[11px] font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-full transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Periksa aksesibilitas FAL_KEY dan diagnostik komunikasi OpenRouter/GPT-5"
            >
              <Sparkles className="w-3 h-3 text-teal-600" />
              <span>Diagnostik Pipeline</span>
            </button>
            <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full w-fit">
              Master Facade: Terkunci
            </span>
          </div>
        </div>

        {/* Requirement #2 & #7 & #11: Prepare Facade for Selected Ratio Panel */}
        <div className="bg-slate-50/90 rounded-xl p-4 border border-slate-200 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2.5">
            <div className="flex items-center gap-2">
              <Crop className="w-4 h-4 text-teal-600" />
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-800">
                Tahap 1: Persiapan Fasad untuk Rasio {aspectRatio} (Zero Generative Fill)
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-teal-800 bg-teal-100/90 px-2.5 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                <Lock className="w-3 h-3 text-teal-600" />
                Pixel-Grounded Base (Image 1)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Live Crop Preview Box */}
            <div className="md:col-span-4 flex items-center justify-center bg-slate-900/5 rounded-xl p-2.5 border border-slate-200/90 min-h-[150px]">
              {lockedFacadeUrl ? (
                <div className="relative group text-center max-w-full">
                  <div className="relative inline-block overflow-hidden rounded-lg">
                    <img
                      src={lockedFacadeUrl}
                      alt="Locked Facade Crop Preview"
                      className="max-h-40 rounded-lg object-contain shadow-xs border border-slate-300 mx-auto"
                    />
                    {/* Protected Mask Visual Indicator if Editor open */}
                    {showMaskEditor && (
                      <div
                        className="absolute border-2 border-emerald-400 bg-emerald-500/25 pointer-events-none transition-all"
                        style={{
                          left: `${currentMask.x}%`,
                          top: `${currentMask.y}%`,
                          width: `${currentMask.width}%`,
                          height: `${currentMask.height}%`,
                        }}
                      >
                        <span className="absolute top-1 left-1 bg-emerald-700 text-white text-[8px] font-bold px-1 rounded shadow-xs">
                          Protected Facade
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center justify-center gap-1 text-[10px] text-teal-800 font-semibold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    <CheckCircle className="w-3 h-3 text-teal-600" />
                    <span>Crop Rasio {aspectRatio} Terkunci</span>
                  </div>
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 p-4">
                  <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                  <span>Memproses crop deterministic...</span>
                </div>
              )}
            </div>

            {/* Controls: Mode, Position, and Engine */}
            <div className="md:col-span-8 space-y-3 text-xs">
              {/* Row 1: Mode Selection (Strict vs Creative) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="font-bold text-slate-800 block text-[11px]">Mode Proteksi Fasad:</span>
                  <span className="text-[10px] text-slate-500">
                    {facadeMode === 'strict'
                      ? 'STRICT: Bangunan dipertahankan 100% identik tanpa redesain struktur.'
                      : 'CREATIVE: Model boleh reinterpretasi framing. Akurasi fasad dapat berkurang.'}
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setFacadeMode('strict')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      facadeMode === 'strict'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    🔒 Strict Facade Lock
                  </button>
                  <button
                    type="button"
                    onClick={() => setFacadeMode('creative')}
                    className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                      facadeMode === 'creative'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    ✨ Creative Edit
                  </button>
                </div>
              </div>

              {/* Row 2: Crop Position Selector */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-[11px]">Posisi Crop Deterministic:</span>
                  <span className="text-[10px] text-slate-400">Pilih framing fasad asli sebelum AI dijalankan</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['left', 'center', 'right', 'custom'] as CropPosition[]).map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setCropPosition(pos)}
                      className={`py-1.5 px-2 rounded-lg text-center font-bold text-[11px] capitalize border transition-all cursor-pointer ${
                        cropPosition === pos
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {pos === 'left' ? 'Kiri / Atas' : pos === 'center' ? 'Tengah (Pusat)' : pos === 'right' ? 'Kanan / Bawah' : 'Kustom'}
                    </button>
                  ))}
                </div>
                {cropPosition === 'custom' && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 shrink-0">Pan Offset:</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={customCropOffset}
                      onChange={(e) => setCustomCropOffset(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                    />
                    <span className="text-[10px] font-mono text-slate-700 w-8 text-right">
                      {Math.round(customCropOffset * 100)}%
                    </span>
                  </div>
                )}
              </div>

              {/* Row 3: Engine Selector (Nano Banana Pro vs Seedream 5 Pro Precision Edit) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-slate-200/70">
                <div>
                  <span className="font-bold text-slate-800 text-[11px]">Engine AI Image:</span>
                  <span className="text-[10px] text-slate-500 block">
                    {selectedEngine === 'nano-banana'
                      ? 'Nano Banana Pro Edit (Google Gemini 3 Pro Vision Image) — Default'
                      : 'Seedream 5 Pro Precision Edit (ByteDance) — Opsi Precision Edit'}
                  </span>
                </div>
                <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedEngine('nano-banana')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      selectedEngine === 'nano-banana'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Nano Banana Pro
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedEngine('seedream')}
                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      selectedEngine === 'seedream'
                        ? 'bg-teal-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Seedream 5 Pro
                  </button>
                </div>
              </div>

              {/* Row 4: Mask Editor Toggle & Tuning */}
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/70 space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowMaskEditor(!showMaskEditor)}
                    className="font-bold text-teal-800 text-[11px] hover:text-teal-900 flex items-center gap-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
                    <span>{showMaskEditor ? '▲ Sembunyikan Mask Bangunan' : '▼ Sesuaikan Mask Bangunan (Strict Preserve)'}</span>
                  </button>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Area: {currentMask.width}%×{currentMask.height}% • Feather: {currentMask.featherPx || 12}px
                  </span>
                </div>

                {showMaskEditor && (
                  <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-[10px]">
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-semibold">Posisi X ({currentMask.x}%):</label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={currentMask.x}
                        onChange={(e) => handleUpdateMask({ x: Number(e.target.value) })}
                        className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-semibold">Posisi Y ({currentMask.y}%):</label>
                      <input
                        type="range"
                        min="0"
                        max="80"
                        value={currentMask.y}
                        onChange={(e) => handleUpdateMask({ y: Number(e.target.value) })}
                        className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-semibold">Lebar ({currentMask.width}%):</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={currentMask.width}
                        onChange={(e) => handleUpdateMask({ width: Number(e.target.value) })}
                        className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-semibold">Tinggi ({currentMask.height}%):</label>
                      <input
                        type="range"
                        min="20"
                        max="100"
                        value={currentMask.height}
                        onChange={(e) => handleUpdateMask({ height: Number(e.target.value) })}
                        className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-0.5 font-semibold">Feather Softness ({currentMask.featherPx || 12}px):</label>
                      <input
                        type="range"
                        min="4"
                        max="32"
                        value={currentMask.featherPx || 12}
                        onChange={(e) => handleUpdateMask({ featherPx: Number(e.target.value) })}
                        className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Aspect Ratio Selector (Requirement #5) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Aspect Ratio (Native Nano Banana)
            </label>
            <select
              value={aspectRatio}
              onChange={(e) => setAspectRatio(e.target.value as AspectRatioOption)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
            >
              <option value="4:5">4:5 — Instagram Feed (Default)</option>
              <option value="9:16">9:16 — Story / Reels</option>
              <option value="1:1">1:1 — Square</option>
              <option value="5:4">5:4 — Landscape Social</option>
              <option value="16:9">16:9 — Wide / Web</option>
            </select>
          </div>

          {/* Image Resolution Selector (Requirement #9) */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Resolusi Output
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value as ResolutionOption)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
            >
              <option value="1K">1K (Cepat &amp; Hemat Biaya)</option>
              <option value="2K">2K (Default Standar Editorial)</option>
              <option value="4K">4K (Ultra HD Detail — Biaya Tinggi)</option>
            </select>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              *Resolusi lebih tinggi memiliki biaya komputasi lebih tinggi pada fal.ai
            </span>
          </div>

          {/* Visual Style */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Arah Gaya Visual
            </label>
            <select
              value={styleOption}
              onChange={(e) => setStyleOption(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
            >
              <option value="Mixed">Campuran Otomatis (Alur Cerita)</option>
              <option value="Couple Golden Hour">Couple Golden Hour (Sinar Hangat)</option>
              <option value="Family Connection">Family Connection (Interaksi Dekat)</option>
              <option value="Playful Family">Playful Family (Anak Ceria)</option>
              <option value="Youthful Editorial">Youthful Editorial (Trendy)</option>
              <option value="Modern Professional">Modern Professional (Eksekutif)</option>
            </select>
          </div>

          {/* Casting */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
              Casting Dominan
            </label>
            <select
              value={castingOption}
              onChange={(e) => setCastingOption(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs sm:text-sm bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-medium"
            >
              <option value="Keluarga Muda">Keluarga Muda (Orang Tua &amp; Anak)</option>
              <option value="Pasangan">Pasangan Baru Menikah</option>
              <option value="Profesional Muda">Profesional Muda</option>
              <option value="Keluarga Multigenerasi">Keluarga Multigenerasi</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100">
          <button
            onClick={handleGenerateBlueprint}
            disabled={isGeneratingBlueprint}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            {isGeneratingBlueprint ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Menyusun via GPT-5...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-3.5 h-3.5" />
                <span>1. Buat Blueprint Carousel (GPT-5)</span>
              </>
            )}
          </button>

          {/* Test 1 Scene Button */}
          <button
            onClick={() => handleGenerateSingleScene(0)}
            disabled={generatingSlideIndex !== null || blueprints.length === 0}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 text-xs font-bold shadow-xs flex items-center gap-2 transition-colors disabled:opacity-50 border border-teal-500/30"
          >
            {generatingSlideIndex === 0 ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-teal-300/30 border-t-teal-300 rounded-full animate-spin" />
                <span>Nano Banana Memproses Slide 1...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-teal-400 fill-teal-400" />
                <span>2. Uji Coba 1 Adegan (Nano Banana Pro)</span>
              </>
            )}
          </button>

          {blueprints.length > 0 && (
            <button
              onClick={() => setConfirmGenerateAll(true)}
              disabled={generatingSlideIndex !== null}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>3. Proses Semua Slide Sekaligus</span>
            </button>
          )}

          {Object.keys(renderedPosters).length > 0 && (
            <button
              onClick={handleRenderAllPosters}
              disabled={isRenderingAll}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors ml-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRenderingAll ? 'animate-spin' : ''}`} />
              <span>Render Ulang Tipografi</span>
            </button>
          )}
        </div>
      </div>

      {/* Cost Protection Confirmation Modal */}
      {confirmGenerateAll && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">Konfirmasi Pemrosesan Gambar</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Anda akan menghasilkan <strong>{blueprints.length} gambar</strong> menggunakan{' '}
              <strong>Nano Banana Pro Edit ({resolution}, rasio {aspectRatio})</strong>. Setiap generasi akan
              menggunakan kredit saldo fal.ai Anda. Apakah Anda yakin ingin melanjutkan?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmGenerateAll(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                onClick={handleExecuteGenerateAll}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm"
              >
                Lanjutkan Generate ({blueprints.length} Slide)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slides Grid Presentation */}
      {blueprints.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-600" />
              Daftar Slide Kampanye ({blueprints.length} Slide) — Rasio {aspectRatio}
            </h4>
            <span className="text-xs text-slate-500">
              Setiap slide menampilkan foto visual murni, poster tipografi, dan opsi animasi Kling 3.0 Pro
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {blueprints.map((slide) => {
              const idx = slide.index;
              const hasScene = Boolean(scenes[idx]);
              const hasPoster = Boolean(renderedPosters[idx]);
              const isProcessing = generatingSlideIndex === idx;
              const videoJob = videoJobs[idx];

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Slide Card Header */}
                  <div>
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Slide {idx + 1}: {slide.slide_role || slide.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isProcessing ? (
                          <span className="text-[10px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                            <div className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                            Nano Banana...
                          </span>
                        ) : hasPoster ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-600" /> Siap
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            Menunggu Generate
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dual Previews: Clean Scene vs Final Poster */}
                    <div className="p-4 space-y-3">
                      {/* Active Master Reference Bar with Compare & Version buttons */}
                      <div className="flex items-center justify-between p-2 bg-slate-50 rounded-xl border border-slate-200/90 text-xs">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={lockedFacadeUrl || propertyImage}
                            alt="Master Ref"
                            className="w-8 h-8 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                          />
                          <div className="truncate">
                            <span className="font-bold text-slate-800 text-[10px] block truncate">
                              Ref: Image 1 (v{propertyMeta?.referenceVersion || 1})
                            </span>
                            <span className="text-[9px] text-teal-700 font-semibold block">
                              Architectural Ground Truth
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setReviewIndex(idx)}
                            className="px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200/80 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Bandingkan langsung fasad asli vs hasil (Split Wipe & Side-by-Side)"
                          >
                            <Split className="w-3 h-3 text-teal-600" />
                            <span>Bandingkan</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVersionHistorySlide(idx)}
                            className="px-2 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                            title="Lihat riwayat versi dan kembalikan ke versi sebelumnya"
                          >
                            <History className="w-3 h-3 text-slate-500" />
                            <span>v{getSlideVersionHistory(idx).length || 1}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5">
                        {/* Left: Clean Scene Visual */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                            Visual Murni (Nano Banana)
                          </span>
                          <div className="aspect-4/5 rounded-xl bg-slate-900 border border-slate-200 overflow-hidden relative group flex items-center justify-center">
                            {hasScene ? (
                              <>
                                <img
                                  src={scenes[idx]}
                                  alt={`Visual Slide ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => handleDownloadClean(idx)}
                                  className="absolute bottom-2 right-2 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Unduh gambar visual bersih"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <div className="text-center p-3 text-slate-500">
                                <FileImage className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                                <span className="text-[10px]">Belum di-generate</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Final Poster with Typography */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">
                            Poster Final (Tipografi)
                          </span>
                          <div className="aspect-4/5 rounded-xl bg-slate-900 border border-teal-200 overflow-hidden relative group flex items-center justify-center">
                            {hasPoster ? (
                              <>
                                <img
                                  src={renderedPosters[idx]}
                                  alt={`Poster Slide ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2">
                                  <button
                                    onClick={() => setReviewIndex(idx)}
                                    className="bg-white/90 hover:bg-white text-slate-900 p-2 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                                    title="Review preview besar"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDownloadPoster(idx)}
                                    className="bg-teal-600 hover:bg-teal-500 text-white p-2 rounded-lg text-xs font-semibold flex items-center gap-1 shadow-sm"
                                    title="Unduh poster lengkap"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </>
                            ) : (
                              <div className="text-center p-3 text-slate-500">
                                <FileImage className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                                <span className="text-[10px]">Menunggu render</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Requirement #8 & #9: Visual QA Evaluation Result */}
                      {isCheckingQA[idx] && (
                        <div className="p-2.5 rounded-xl bg-teal-50/70 border border-teal-200 text-teal-900 text-xs flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin shrink-0" />
                          <span className="text-[11px] font-medium">
                            Memverifikasi fidelitas fasad via fal OpenRouter Vision...
                          </span>
                        </div>
                      )}

                      {/* Not Validated State (Truthful display before QA runs) */}
                      {!visualQA[idx] && !isCheckingQA[idx] && hasScene && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs flex items-center justify-between">
                          <span className="text-[10px] font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                            <span>GUARD: <strong>NOT_VALIDATED</strong> — Belum diperiksa secara visual</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setReviewIndex(idx)}
                            className="text-[10px] font-bold text-teal-700 hover:underline cursor-pointer"
                          >
                            Bandingkan Fasad →
                          </button>
                        </div>
                      )}

                      {visualQA[idx] && !isCheckingQA[idx] && (
                        <div
                          className={`p-2.5 rounded-xl text-xs space-y-1.5 border transition-all ${
                            visualQA[idx].status === 'PASS' || visualQA[idx].pass
                              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
                              : visualQA[idx].status === 'NEEDS_REVIEW'
                              ? 'bg-amber-50 border-amber-300 text-amber-950'
                              : 'bg-rose-50 border-rose-300 text-rose-950'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold flex items-center gap-1.5 text-[11px]">
                              {visualQA[idx].status === 'PASS' || visualQA[idx].pass ? (
                                <>
                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>GUARD: PASS — Fasad Terverifikasi Identik</span>
                                </>
                              ) : visualQA[idx].status === 'NEEDS_REVIEW' ? (
                                <>
                                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>GUARD: NEEDS REVIEW — Perlu Verifikasi Manual</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                  <span>GUARD: REJECT — Fasad Berubah dari Referensi</span>
                                </>
                              )}
                            </span>
                            <span
                              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded shrink-0 ${
                                visualQA[idx].status === 'PASS' || visualQA[idx].pass
                                  ? 'bg-emerald-200/80 text-emerald-900'
                                  : visualQA[idx].status === 'NEEDS_REVIEW'
                                  ? 'bg-amber-200/80 text-amber-900'
                                  : 'bg-rose-200/80 text-rose-900'
                              }`}
                            >
                              Skor {visualQA[idx].overall_score}%
                            </span>
                          </div>

                          <div className="grid grid-cols-4 gap-1 text-[9px] text-slate-600 font-mono">
                            <div className="bg-white/80 p-1 rounded border border-slate-200/60 text-center">
                              Atap: <strong>{visualQA[idx].roof_geometry_match}%</strong>
                            </div>
                            <div className="bg-white/80 p-1 rounded border border-slate-200/60 text-center">
                              Bukaan: <strong>{visualQA[idx].window_door_layout_match}%</strong>
                            </div>
                            <div className="bg-white/80 p-1 rounded border border-slate-200/60 text-center">
                              Massa: <strong>{visualQA[idx].massing_match}%</strong>
                            </div>
                            <div className="bg-white/80 p-1 rounded border border-slate-200/60 text-center">
                              Proporsi: <strong>{visualQA[idx].facade_proportion_match}%</strong>
                            </div>
                          </div>

                          {!visualQA[idx].pass && (
                            <div className="space-y-1.5 pt-1 border-t border-rose-200/70">
                              {visualQA[idx].critical_changes && visualQA[idx].critical_changes.length > 0 && (
                                <ul className="list-disc pl-4 text-[10px] text-rose-800 space-y-0.5">
                                  {visualQA[idx].critical_changes.map((change, cIdx) => (
                                    <li key={cIdx}>{change}</li>
                                  ))}
                                </ul>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setFacadeMode('strict');
                                  handleGenerateSingleScene(idx, true);
                                }}
                                disabled={isProcessing}
                                className="w-full py-1.5 px-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 shadow-xs transition-colors cursor-pointer"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Perketat &amp; Regenerate (Strict Preserve)</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Video Status Badge if Kling was triggered */}
                      {videoJob && (
                        <div className="p-2.5 rounded-xl bg-slate-900 text-white border border-teal-500/30 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Film className="w-4 h-4 text-teal-400 shrink-0" />
                            <div>
                              <span className="font-bold text-[11px] block">Video Kling 3.0 Pro</span>
                              <span className="text-[10px] text-slate-400">Status: {videoJob.status}</span>
                            </div>
                          </div>
                          {videoJob.status === 'Completed' && videoJob.videoUrl && (
                            <button
                              onClick={() => handleDownloadVideo(idx)}
                              className="px-2.5 py-1 bg-teal-500 hover:bg-teal-400 text-slate-950 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" /> Unduh MP4
                            </button>
                          )}
                          {videoJob.status === 'Generating' && (
                            <div className="w-3.5 h-3.5 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                          )}
                        </div>
                      )}

                      {/* Editorial Copy Meta */}
                      <div className="space-y-1.5 pt-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 truncate pr-2 text-xs">
                            {slide.headline}
                          </span>
                          <button
                            onClick={() => setTextEditIndex(idx)}
                            className="text-slate-400 hover:text-teal-600 transition-colors p-1"
                            title="Edit Headline & Copy"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {slide.subheadline || slide.copy}
                        </p>
                      </div>

                      {/* Editable AI Prompt Preview */}
                      <div className="bg-slate-50 rounded-lg p-2 border border-slate-200/80 text-[10px] text-slate-600 space-y-1">
                        <div className="flex items-center justify-between font-bold text-slate-700 uppercase">
                          <span>Prompt Nano Banana Pro</span>
                          <button
                            onClick={() => {
                              setPromptEditIndex(idx);
                              setEditedPromptText(slide.nano_banana_prompt || slide.shot);
                            }}
                            className="text-teal-600 hover:underline cursor-pointer"
                          >
                            Edit Prompt
                          </button>
                        </div>
                        <p className="line-clamp-2 font-mono text-[9px] text-slate-500">
                          {slide.nano_banana_prompt || slide.shot}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-1.5">
                    <button
                      onClick={() => handleGenerateSingleScene(idx)}
                      disabled={isProcessing}
                      className="flex-1 py-1.5 px-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-[11px] font-bold shadow-xs flex items-center justify-center gap-1 transition-colors disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : hasScene ? (
                        <>
                          <RotateCcw className="w-3 h-3" />
                          <span>Regenerate</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-white" />
                          <span>Generate Image</span>
                        </>
                      )}
                    </button>

                    {/* Kling 3.0 Animation Action (Requirement #10 & #11) */}
                    <button
                      onClick={() => handleOpenKlingPanel(idx)}
                      disabled={!hasScene}
                      className="py-1.5 px-2.5 bg-slate-900 hover:bg-slate-800 text-teal-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-teal-500/20"
                      title={hasScene ? 'Animasi gambar dengan Kling 3.0 Pro' : 'Generate gambar terlebih dahulu'}
                    >
                      <Film className="w-3 h-3 text-teal-400" />
                      <span>Animate Kling</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Kling 3.0 Pro Animation Panel / Modal (Requirement #11) */}
      {activeKlingSlide !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base text-white">
                  Animate Slide {activeKlingSlide + 1} dengan Kling 3.0 Pro
                </h3>
              </div>
              <button
                onClick={() => setActiveKlingSlide(null)}
                className="text-slate-400 hover:text-white font-bold p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Image Start Preview */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Gambar Awal (Start Image)
                </span>
                <div className="aspect-4/5 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden">
                  <img
                    src={scenes[activeKlingSlide]}
                    alt={`Start Slide ${activeKlingSlide + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="space-y-3.5">
                {/* Motion Preset */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Motion Preset
                  </label>
                  <select
                    value={klingConfig.preset}
                    onChange={(e) => setKlingConfig((prev) => ({ ...prev, preset: e.target.value as any }))}
                    className="w-full rounded-xl border border-slate-700 px-3 py-2 text-xs bg-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Subtle Cinematic">Subtle Cinematic (Push In Halus)</option>
                    <option value="Slow Dolly In">Slow Dolly In (Maju ke Teras)</option>
                    <option value="Architectural Reveal">Architectural Reveal (Atap &amp; Fasad)</option>
                    <option value="Lifestyle Motion">Lifestyle Motion (Aktivitas Talent)</option>
                    <option value="Custom">Custom Prompt</option>
                  </select>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Durasi Video
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setKlingConfig((prev) => ({ ...prev, duration: '5' }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        klingConfig.duration === '5'
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> 5 Detik (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => setKlingConfig((prev) => ({ ...prev, duration: '10' }))}
                      className={`py-2 rounded-xl text-xs font-bold border transition-colors flex items-center justify-center gap-1.5 ${
                        klingConfig.duration === '10'
                          ? 'bg-teal-600 text-white border-teal-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Clock className="w-3.5 h-3.5" /> 10 Detik
                    </button>
                  </div>
                </div>

                {/* Audio Option */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Audio Kling
                  </label>
                  <button
                    type="button"
                    onClick={() => setKlingConfig((prev) => ({ ...prev, audio: !prev.audio }))}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold border transition-colors flex items-center justify-between ${
                      klingConfig.audio
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <span>Generasi Suara Latar</span>
                    {klingConfig.audio ? (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Volume2 className="w-3.5 h-3.5" /> ON
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-400">
                        <VolumeX className="w-3.5 h-3.5" /> OFF (Default)
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Motion Prompt Textarea */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Kling Motion Prompt (Filosofi Konservasi Fasad)
              </label>
              <textarea
                value={klingConfig.prompt}
                onChange={(e) => setKlingConfig((prev) => ({ ...prev, prompt: e.target.value }))}
                rows={3}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <span className="text-[10px] text-slate-400 block mt-1">
                *Fasad gedung dipertahankan stabil. Kamera bergerak halus tanpa mengubah bentuk fisik rumah.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-[11px] text-amber-300">
                Memproses video {klingConfig.duration}s pada fal.ai queue
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveKlingSlide(null)}
                  className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    handleTriggerKlingVideo();
                    setActiveKlingSlide(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Generate Video ({klingConfig.duration}s)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prompt Modal */}
      {promptEditIndex !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-base text-slate-900">
                Edit Prompt Nano Banana Pro (Slide {promptEditIndex + 1})
              </h3>
              <button
                onClick={() => setPromptEditIndex(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>
            <textarea
              value={editedPromptText}
              onChange={(e) => setEditedPromptText(e.target.value)}
              rows={8}
              className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPromptEditIndex(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setBlueprints((prev) =>
                    prev.map((s) =>
                      s.index === promptEditIndex
                        ? { ...s, nano_banana_prompt: editedPromptText, shot: editedPromptText }
                        : s
                    )
                  );
                  setPromptEditIndex(null);
                  setStatusMessage({
                    type: 'success',
                    text: `Prompt Slide ${promptEditIndex + 1} berhasil diperbarui.`,
                  });
                }}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold"
              >
                Simpan Prompt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Typography Edit Modal */}
      {textEditIndex !== null && blueprints[textEditIndex] && (
        <TextEditModal
          isOpen={textEditIndex !== null}
          slide={blueprints[textEditIndex]}
          onClose={() => setTextEditIndex(null)}
          onSave={async (updatedSlide, font) => {
            setBlueprints((prev) => prev.map((s) => (s.index === updatedSlide.index ? updatedSlide : s)));
            const sceneUrl = scenes[updatedSlide.index] || propertyImage;
            const newPoster = await renderPosterToDataUrl({
              sceneUrl,
              slide: updatedSlide,
              project,
              logoUrl: logoImage,
              headlineFont: font,
            });
            setRenderedPosters((prev) => ({ ...prev, [updatedSlide.index]: newPoster }));
            setTextEditIndex(null);
          }}
        />
      )}

      {/* Review Big Modal with Split Slider and Honest Architectural Consistency Guard */}
      {reviewIndex !== null && blueprints[reviewIndex] && (
        <ReviewModal
          isOpen={reviewIndex !== null}
          onClose={() => setReviewIndex(null)}
          masterImage={lockedFacadeUrl || propertyImage}
          posterImage={renderedPosters[reviewIndex] || propertyImage}
          cleanSceneImage={scenes[reviewIndex] || propertyImage}
          slide={blueprints[reviewIndex]}
          slideNumber={reviewIndex + 1}
          onDownload={() => handleDownloadPoster(reviewIndex)}
          visualQA={visualQA[reviewIndex] || null}
          referenceVersion={propertyMeta?.referenceVersion || 1}
        />
      )}

      {/* Version History Modal per Slide */}
      {versionHistorySlide !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900">
                <History className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base">
                  Riwayat Versi Hasil — Slide {versionHistorySlide + 1}
                </h3>
              </div>
              <button
                onClick={() => setVersionHistorySlide(null)}
                className="text-slate-400 hover:text-slate-700 font-bold p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Pilih salah satu versi generasi sebelumnya untuk dikembalikan. Fasad dan evaluasi QA akan disinkronkan kembali.
            </p>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {getSlideVersionHistory(versionHistorySlide).length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl">
                  Belum ada riwayat versi untuk slide ini.
                </div>
              ) : (
                getSlideVersionHistory(versionHistorySlide).map((rec) => {
                  const isCurrent = scenes[versionHistorySlide] === rec.imageUrl;
                  return (
                    <div
                      key={rec.version}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        isCurrent
                          ? 'border-teal-500 bg-teal-50/40 ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={rec.imageUrl}
                          alt={`Versi ${rec.version}`}
                          className="w-12 h-14 object-cover rounded-lg border border-slate-200 shadow-2xs shrink-0"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-xs text-slate-900">
                              Versi {rec.version}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-bold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                                Aktif
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                rec.guardStatus === 'PASS'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.guardStatus === 'REJECT'
                                  ? 'bg-rose-100 text-rose-800'
                                  : rec.guardStatus === 'NEEDS_REVIEW'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {rec.guardStatus}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">
                            {rec.note || (rec.guardMode === 'strict' ? 'Strict Preserve' : 'Creative Edit')} • {rec.timestamp}
                          </span>
                        </div>
                      </div>

                      <div>
                        {isCurrent ? (
                          <span className="text-[11px] font-semibold text-teal-700">Sedang Digunakan</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleRevertSlideVersion(versionHistorySlide, rec)}
                            className="px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                          >
                            Gunakan Versi Ini
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setVersionHistorySlide(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kling Video Fidelity Warning Modal */}
      {klingWarningSlide !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-slate-900">
                Peringatan Konsistensi Fasad Arsitektur
              </h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Gambar Slide {klingWarningSlide + 1} belum terverifikasi <strong>PASS</strong> pada
              Architectural Consistency Guard (Status:{' '}
              <span className="font-bold text-rose-600">
                {visualQA[klingWarningSlide]?.status || 'REJECT / BELUM VERIFIKASI'}
              </span>
              ).
            </p>
            <p className="text-xs text-slate-600 leading-relaxed">
              Mengirim gambar ini ke model video (Kling) berisiko tinggi menyebabkan <strong>morphing struktur</strong>,
              perubahan bentuk jendela, atau deformasi atap pada hasil rekaman video.
            </p>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
              <span className="font-bold block">Rekomendasi Guard:</span>
              <span>
                Gunakan mode <strong>Strict Preserve</strong> atau lakukan regenerasi lebih ketat terlebih dahulu sebelum memproduksi video.
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setKlingWarningSlide(null)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const targetIdx = klingWarningSlide;
                  setKlingWarningSlide(null);
                  setFacadeMode('strict');
                  handleGenerateSingleScene(targetIdx, true);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold cursor-pointer"
              >
                Beralih ke Strict Preserve &amp; Regenerate
              </button>
              <button
                onClick={() => {
                  const targetIdx = klingWarningSlide;
                  setKlingWarningSlide(null);
                  proceedToKlingPanel(targetIdx);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Tetap Lanjut (Risiko Morphing)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Next Step Banner */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Langkah Selanjutnya: UGC Script &amp; Storyboard</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Susun naskah percakapan, storyboard scene, dan prompt pack siap pakai untuk Google Flow.
          </p>
        </div>
        <button
          onClick={onProceedToVideo}
          className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 shadow-xs shrink-0 transition-colors"
        >
          <span>Lanjut ke UGC Script &amp; Storyboard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {/* Diagnostic Modal */}
      <DiagnosticModal
        isOpen={isDiagnosticOpen}
        onClose={() => setIsDiagnosticOpen(false)}
      />
    </div>
  );
};
