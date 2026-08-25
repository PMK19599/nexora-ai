import React, { useState, useEffect, useRef } from 'react';
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
  const [latencyLogs, setLatencyLogs] = useState<number[]>([]);
  const [ballPosition, setBallPosition] = useState({ x: 10, y: 50 });
  const [detectedADHD, setDetectedADHD] = useState(false);
  const [chosenPreset, setChosenPreset] = useState<'focus' | 'predictable' | 'reading' | 'none'>('none');
  const stepStartTime = useRef<number>(Date.now());
  const store = useAccessibilityStore();
  const { updateProfile } = useAuthStore();

  const handleComplete = () => {
    if (onCalibrationComplete) onCalibrationComplete();
    if (onComplete) onComplete();
  };

  // Test Phase 1: Interactive Cognitive Tracking Exercise
  useEffect(() => {
    if (testStep !== 1) return;
    const interval = setInterval(() => {
      setBallPosition({
        x: Math.sin(Date.now() / 400) * 40 + 50,
        y: Math.cos(Date.now() / 600) * 30 + 50,
      });
    }, 16);
    return () => clearInterval(interval);
  }, [testStep]);

  const handleTargetClick = () => {
    const interactionDelta = Date.now() - stepStartTime.current;
    setLatencyLogs((prev) => [...prev, interactionDelta]);
    stepStartTime.current = Date.now();

    if (latencyLogs.length >= 4) {
      // Process latency profiles to determine focus settings
      const averageLatency =
        latencyLogs.reduce((a, b) => a + b, 0) / latencyLogs.length;
      if (averageLatency > 1200) {
        setDetectedADHD(true);
        setChosenPreset('focus');
        store.applyPreset('focus'); // Configure short burst/high gamification defaults
      }
      setTestStep(2);
    }
  };

  const handlePresetSelect = (preset: 'focus' | 'predictable' | 'reading' | 'none') => {
    setChosenPreset(preset);
    if (preset === 'none') {
      store.applyPreset('clear');
    } else {
      store.applyPreset(preset as any);
    }
    setTestStep(3);
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
              Calibrating Focus Interface Bounds
            </h3>
            <p className="text-slate-400 text-sm">
              Click the moving celestial cluster node accurately as it traverses the canvas matrix.
            </p>
          </div>
          <div className="relative w-full h-64 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={handleTargetClick}
              className="absolute w-8 h-8 rounded-full bg-gradient-to-tr from-teal-400 to-emerald-500 shadow-lg shadow-teal-500/40 -translate-x-1/2 -translate-y-1/2 cursor-crosshair transition-transform active:scale-95"
              style={{ left: `${ballPosition.x}%`, top: `${ballPosition.y}%` }}
            />
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Captured Context Data Nodes: {latencyLogs.length} / 5
          </div>
        </div>
      )}

      {testStep === 2 && (
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Optimal Contrast & Layout Configuration
            </h3>
            {detectedADHD && (
              <div className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-400 mb-2">
                ⚡ Focus latency variance detected. ADHD presets auto-applied.
              </div>
            )}
            <p className="text-slate-400 text-sm">
              Select the viewport layout configuration that feels most natural to scan cleanly.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handlePresetSelect(detectedADHD ? 'focus' : 'none')}
              className="p-6 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600 text-left transition-all hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-slate-200">Standard Balance</p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Clean fonts configured with minimal design footprints for baseline environments.
              </p>
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('reading')}
              className="p-6 rounded-xl border border-teal-900/50 bg-teal-950/10 hover:border-teal-500 text-left transition-all font-dyslexic hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-teal-400">High Weight Typeface</p>
              <p className="text-xs text-teal-600/80 mt-2 leading-relaxed tracking-wide">
                Heavy bottoms eliminate standard typographical symmetry rotation vulnerabilities completely.
              </p>
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('predictable')}
              className="p-6 rounded-xl border border-slate-800 bg-slate-950 hover:border-slate-600 text-left transition-all hover:scale-[1.02] flex flex-col"
            >
              <p className="text-sm font-semibold text-purple-400">
                Structured & Predictable
              </p>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Rigid checklists, consistent layouts, no animations, and reduced clutter.
              </p>
            </button>
          </div>
        </div>
      )}

      {testStep === 3 && (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/5">
            <span className="text-2xl">✨</span>
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Calibration Successfully Locked
            </h3>
            <p className="text-slate-400 text-sm">
              System rendering engines have calibrated layout metrics directly tailored to your processing configuration.
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
