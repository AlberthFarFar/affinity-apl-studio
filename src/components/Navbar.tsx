import React from 'react';
import { Home, CheckCircle2, ChevronRight, Menu, X, Sparkles, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentStep: number;
  onNavigate: (step: number) => void;
  masterLocked: boolean;
  hasPropertyImage: boolean;
  onOpenDiagnostics?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentStep,
  onNavigate,
  masterLocked,
  hasPropertyImage,
  onOpenDiagnostics,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const steps = [
    { id: 1, title: 'Input Proyek', label: '1. Input Proyek' },
    { id: 2, title: 'Master Properti', label: '2. Master Properti' },
    { id: 3, title: 'Carousel', label: '3. Carousel' },
    { id: 4, title: 'UGC Script & Storyboard', label: '4. UGC Script & Storyboard' },
    { id: 5, title: 'Caption', label: '5. Caption' },
  ];

  const handleStepClick = (stepId: number) => {
    if (stepId > 1 && !hasPropertyImage) return;
    if (stepId > 2 && !masterLocked) return;
    onNavigate(stepId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm shadow-teal-700/20">
            <Home className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Affinity</span>
              <span className="text-[10px] uppercase tracking-wider font-bold bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full border border-teal-200">
                APL Studio
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Frames &amp; Footage Production</p>
          </div>
        </div>

        {/* Desktop Step Navigation */}
        <nav className="hidden md:flex items-center space-x-1 border border-slate-200/80 rounded-xl p-1 bg-slate-100/70">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isBlocked =
              (step.id > 1 && !hasPropertyImage) || (step.id > 2 && !masterLocked);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                disabled={isBlocked && step.id > currentStep}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                  isCurrent
                    ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/60 font-bold'
                    : isCompleted
                    ? 'text-teal-700 hover:text-teal-900 hover:bg-white/60'
                    : isBlocked
                    ? 'text-slate-400 cursor-not-allowed opacity-60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                ) : null}
                <span>{step.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Info Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500 font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Pipeline: <strong className="text-slate-800">fal.ai (GPT-5)</strong></span>
          <span className="text-slate-300">•</span>
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              className="text-[11px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-md transition-colors cursor-pointer flex items-center gap-1"
              title="Buka Diagnostik Aksesibilitas FAL_KEY & Analyze-Master"
            >
              <ShieldCheck className="w-3 h-3 text-teal-600" />
              <span>Diagnostik</span>
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-100"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-lg">
          {steps.map((step) => {
            const isCompleted = step.id < currentStep;
            const isCurrent = step.id === currentStep;
            const isBlocked =
              (step.id > 1 && !hasPropertyImage) || (step.id > 2 && !masterLocked);

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(step.id)}
                disabled={isBlocked && step.id > currentStep}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isCurrent
                    ? 'bg-teal-50 text-teal-800 font-bold'
                    : isCompleted
                    ? 'text-teal-700'
                    : isBlocked
                    ? 'text-slate-300 cursor-not-allowed'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{step.label}</span>
                {isCompleted && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                {isCurrent && <ChevronRight className="w-4 h-4 text-teal-600" />}
              </button>
            );
          })}

          {onOpenDiagnostics && (
            <button
              onClick={() => {
                onOpenDiagnostics();
                setMobileMenuOpen(false);
              }}
              className="w-full mt-2 text-left px-3.5 py-2 text-xs font-semibold rounded-lg text-teal-800 bg-teal-50 border border-teal-200 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600" />
                <span>Diagnostik Pipeline FAL_KEY</span>
              </div>
              <span className="text-[10px] bg-teal-200/60 text-teal-900 px-1.5 py-0.5 rounded font-bold">Cek</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
