import React, { useState } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useAuthStore } from '@/stores/authStore';
import api from '@/services/api';
import toast from 'react-hot-toast';

interface DiagnosticTestProps {
  onComplete?: () => void;
  onCalibrationComplete?: () => void;
}

export default function DiagnosticTest({
  onComplete,
  onCalibrationComplete,
}: DiagnosticTestProps) {
  const [testStep, setTestStep] = useState<number>(1);
  const [chosenPreset, setChosenPreset] = useState<'focus' | 'predictable' | 'reading' | 'none'>('none');
  const store = useAccessibilityStore();
  const { updateProfile } = useAuthStore();

  const handleComplete = () => {
    if (onCalibrationComplete) onCalibrationComplete();
    if (onComplete) onComplete();
  };

  const handlePresetSelect = (preset: 'focus' | 'predictable' | 'reading' | 'none') => {
    setChosenPreset(preset);
    if (preset === 'none') {
      store.applyPreset('clear');
    } else {
      store.applyPreset(preset);
    }
    setTestStep(2);
  };

  const handleFinalize = async () => {
    try {
      const finalPreset = chosenPreset;
      const { data } = await api.put('/auth/profile', {
        neurodivergentType: finalPreset,
        learningTrack: finalPreset !== 'none' ? 'neurodivergent' : 'normal',
      });
      await updateProfile(data.user);
      toast.success(`Calibration successfully locked: ${finalPreset.toUpperCase()}`);
      handleComplete();
    } catch (e) {
      toast.error('Failed to save calibration profile');
      handleComplete();
    }
  };

  return (
    <div className="max-w-2xl mx-auto border border-slate-800 bg-slate-900 rounded-2xl p-8 shadow-2xl relative overflow-hidden text-white">
      {testStep === 1 && (
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Optimal Contrast & Layout Configuration
            </h3>
            <p className="text-slate-400 text-sm">
              Select the viewport layout configuration that feels most natural to scan cleanly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => handlePresetSelect('none')}
              className="p-6 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600 text-left transition-all hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-slate-200">Standard Balance</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Clean fonts configured with minimal design footprints for baseline environments.
              </p>
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('focus')}
              className="p-6 rounded-xl border border-blue-900/50 bg-blue-950/10 hover:border-blue-500 text-left transition-all hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-blue-400">🎯 Focus-Friendly</p>
              <p className="text-xs text-blue-300/80 mt-2 leading-relaxed">
                Streamlined interface, timer tools, and reduced visual distractions for sustained attention.
              </p>
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('reading')}
              className="p-6 rounded-xl border border-teal-900/50 bg-teal-950/10 hover:border-teal-500 text-left transition-all font-dyslexic hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-teal-400">📖 High Weight Typeface</p>
              <p className="text-xs text-teal-600/80 mt-2 leading-relaxed tracking-wide">
                Weighted letter bases designed to increase character distinction and readability.
              </p>
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('predictable')}
              className="p-6 rounded-xl border border-purple-900/50 bg-purple-950/10 hover:border-purple-500 text-left transition-all hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-purple-400">🧩 Structured & Predictable</p>
              <p className="text-xs text-purple-300/80 mt-2 leading-relaxed">
                Rigid checklists, consistent layouts, no animations, and reduced clutter.
              </p>
            </button>
          </div>
        </div>
      )}

      {testStep === 2 && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
            <span className="text-2xl">✨</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Interface Preferences Applied
            </h3>
            <p className="text-slate-400 text-sm">
              Your layout and accessibility settings have been calibrated to your preferred profile.
            </p>
          </div>
          <button
            type="button"
            onClick={handleFinalize}
            className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-teal-500/20 transition-all transform active:scale-[0.99]"
          >
            Initialize Core Workspace Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
