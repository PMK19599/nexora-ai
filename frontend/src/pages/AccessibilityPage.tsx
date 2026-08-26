import { useState } from 'react';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { useAuthStore } from '@/stores/authStore';
import { AccessibilitySettings } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useTTS } from '@/hooks/useTTS';
import DiagnosticTest from '@/components/diagnostic/DiagnosticTest';
import toast from 'react-hot-toast';

export default function AccessibilityPage() {
  const s = useAccessibilityStore();
  const up = s.updateSettings;
  const applyPreset = s.applyPreset;
  const { user, updateProfile } = useAuthStore();
  const { speak, stop, isSpeaking } = useTTS();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const save = async () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { updateSettings, applyPreset, resetSettings, ...settingsOnly } = s;
    try { await updateProfile({ accessibility: settingsOnly }); toast.success('Settings saved!'); } catch { toast.error('Failed to save'); }
  };

  const handleApplyPreset = async (key: 'focus' | 'predictable' | 'reading' | 'none') => {
    applyPreset(key);
    const baseDefaults: AccessibilitySettings = { fontSize: 'normal', colorContrast: 'normal', animations: true, readingMode: false, audioMode: false, focusMode: false, fontFamily: 'default', lineSpacing: 'normal', pomodoroEnabled: false, pomodoroWork: 25, pomodoroBreak: 5, reducedDistractions: false, predictableNavigation: false, ttsEnabled: false, ttsSpeed: 1, reducedMotion: false, highContrast: false };
    const presetsMap: Record<string, Partial<AccessibilitySettings>> = {
      focus: { focusMode: true, pomodoroEnabled: true, pomodoroWork: 15, animations: false, reducedMotion: true },
      predictable: { predictableNavigation: true, animations: false, reducedDistractions: true, reducedMotion: true },
      reading: { fontFamily: 'opendyslexic', lineSpacing: 'extra', ttsEnabled: true, fontSize: 'large', colorContrast: 'high', highContrast: true },
      none: baseDefaults,
    };
    const updated = { ...baseDefaults, ...presetsMap[key] };
    try {
      await updateProfile({
        accessibility: updated,
        neurodivergentType: key,
        learningTrack: key !== 'none' ? 'neurodivergent' : 'normal'
      });
      toast.success(`${key.toUpperCase()} preset applied & saved!`);
    } catch {
      toast.error('Failed to save preset to profile');
    }
  };

  const testTTS = () => {
    if (isSpeaking) { stop(); return; }
    speak('Hello! Text to speech is working. You can click the listen button on any text to hear it read aloud. Adjust the speed below to make it faster or slower.');
  };

  if (showDiagnostic) {
    return (
      <div className="max-w-xl mx-auto py-10 space-y-6 animate-fade-in-up">
        <DiagnosticTest onComplete={() => setShowDiagnostic(false)} />
        <Button variant="ghost" className="mt-4 block mx-auto text-muted-foreground" onClick={() => setShowDiagnostic(false)}>
          ← Cancel and go back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">♿ Accessibility Settings</h1>
          <p className="text-muted-foreground">Customize everything to suit your needs. Changes apply instantly.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleApplyPreset('none')}>Reset & Save</Button>
          <Button onClick={save} className="bg-gradient-to-r from-teal-600 to-emerald-600">💾 Save Settings</Button>
        </div>
      </div>

      {/* Quick Presets */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-teal-50 to-emerald-50">
        <CardHeader>
          <CardTitle className="text-lg">⚡ Quick Presets</CardTitle>
          <CardDescription>One click to apply optimized settings for your needs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { key: 'focus' as const, label: '🎯 Focus-Friendly', desc: 'For attention & focus needs. Commonly helpful for ADHD.', color: 'border-blue-300 bg-blue-50 hover:bg-blue-100' },
              { key: 'predictable' as const, label: '🧩 Predictable Layout', desc: 'For predictable, low-motion experiences. Commonly helpful for many autistic users.', color: 'border-amber-300 bg-amber-50 hover:bg-amber-100' },
              { key: 'reading' as const, label: '📖 Reading-Friendly', desc: 'For reading & text accessibility. Commonly helpful for dyslexia.', color: 'border-green-300 bg-green-50 hover:bg-green-100' },
              { key: 'none' as const, label: '⬜ Default', desc: 'Reset to standard settings', color: 'border-gray-300 bg-gray-50 hover:bg-gray-100' },
            ].map(p => (
              <button key={p.key} onClick={() => handleApplyPreset(p.key)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${p.color}`}>
                <div className="font-bold text-sm">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="font-bold text-sm text-teal-800">Unsure which preset fits you?</p>
              <p className="text-xs text-teal-600">Take our quick 3-question diagnostic assessment to automatically tune your learning environment.</p>
            </div>
            <Button className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white hover:scale-105 transition-transform" onClick={() => setShowDiagnostic(true)}>
              Start Diagnostic Pre-test 🔬
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Text & Font */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">🔤 Text & Font</CardTitle><CardDescription>Change how text looks on screen</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold">Font Size</Label>
              <Select value={s.fontSize} onValueChange={(v: any) => up({ fontSize: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">Small (14px)</SelectItem>
                  <SelectItem value="normal">Normal (16px) — Default</SelectItem>
                  <SelectItem value="large">Large (18px)</SelectItem>
                  <SelectItem value="xlarge">Extra Large (22px)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Font Style</Label>
              <Select value={s.fontFamily} onValueChange={(v: any) => up({ fontFamily: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default (Inter)</SelectItem>
                  <SelectItem value="opendyslexic">OpenDyslexic (Reading-Friendly)</SelectItem>
                  <SelectItem value="arial">Arial (clean & simple)</SelectItem>
                  <SelectItem value="verdana">Verdana (wide & readable)</SelectItem>
                  <SelectItem value="vazirmatn">Vazirmatn (clean & structured)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Font changes apply to the entire app instantly</p>
            </div>
            <div className="space-y-2">
              <Label className="font-semibold">Line Spacing</Label>
              <Select value={s.lineSpacing} onValueChange={(v: any) => up({ lineSpacing: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal (1.6x)</SelectItem>
                  <SelectItem value="wide">Wide (1.9x) — easier to read</SelectItem>
                  <SelectItem value="wider">Wider (2.1x)</SelectItem>
                  <SelectItem value="extra">Extra Wide (2.3x)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Live preview */}
            <div className={`p-4 rounded-xl bg-muted/50 border transition-all ${
              [
                s.fontSize !== 'normal' && s.fontSize !== 'medium' ? `text-size-${s.fontSize} font-size-${s.fontSize}` : '',
                s.fontFamily !== 'default' ? `font-${s.fontFamily === 'opendyslexic' ? 'dyslexic' : s.fontFamily}` : '',
                s.lineSpacing !== 'normal' ? `line-spacing-${s.lineSpacing}` : '',
                s.focusMode ? 'focus-mode' : '',
                s.readingMode ? 'reading-mode' : '',
                s.reducedDistractions ? 'reduced-distractions' : '',
                s.predictableNavigation ? 'predictable-navigation' : '',
                !s.animations || s.reducedMotion ? 'no-animations' : '',
                s.colorContrast === 'high' || s.highContrast ? 'high-contrast' : ''
              ].filter(Boolean).join(' ')
            }`}>
              <p className="text-xs text-muted-foreground mb-1">📋 Live Preview:</p>
              <p>This is how your text looks with the current settings. The quick brown fox jumps over the lazy dog.</p>
              {s.reducedDistractions && <span className="non-essential text-xs text-red-500 block mt-2">This decorative text is non-essential. It will fade out in focus mode and disappear in reduced distractions mode.</span>}
            </div>
          </CardContent>
        </Card>

        {/* Colors & Theme */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">🎨 Colors & Theme</CardTitle><CardDescription>Adjust contrast and appearance</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="font-semibold">Color Theme</Label>
              <Select value={s.colorContrast} onValueChange={(v: any) => up({ colorContrast: v })}>
                <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">☀️ Light (default)</SelectItem>
                  <SelectItem value="dark">🌙 Dark Mode</SelectItem>
                  <SelectItem value="high">🔲 High Contrast</SelectItem>
                  {user?.unlockedRewards?.includes('theme_cyberpunk') && (
                    <SelectItem value="cyberpunk">🌆 Cyberpunk (Unlocked)</SelectItem>
                  )}
                  {user?.unlockedRewards?.includes('theme_cosmic') && (
                    <SelectItem value="cosmic">🌌 Deep Space (Unlocked)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="anim" className="font-semibold">Animations</Label><p className="text-xs text-muted-foreground">Moving elements on screen</p></div>
              <Switch id="anim" checked={s.animations} onCheckedChange={v => up({ animations: v })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="rd" className="font-semibold">Reduced Distractions</Label><p className="text-xs text-muted-foreground">Hide non-essential elements</p></div>
              <Switch id="rd" checked={s.reducedDistractions} onCheckedChange={v => up({ reducedDistractions: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Voice / TTS */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">🔊 Voice & Text-to-Speech</CardTitle><CardDescription>Have the app read text aloud to you</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="tts" className="font-semibold">Enable Text-to-Speech</Label><p className="text-xs text-muted-foreground">Shows "Listen" buttons on text</p></div>
              <Switch id="tts" checked={s.ttsEnabled} onCheckedChange={v => up({ ttsEnabled: v })} />
            </div>
            {s.ttsEnabled && (
              <>
                <div className="space-y-2">
                  <Label className="font-semibold">Voice Speed</Label>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Slow</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={s.ttsSpeed}
                      onChange={e => up({ ttsSpeed: parseFloat(e.target.value) })}
                      className="flex-1 accent-teal-600 h-2" />
                    <span className="text-xs text-muted-foreground">Fast</span>
                    <span className="text-sm font-mono font-bold w-10">{s.ttsSpeed}x</span>
                  </div>
                </div>
                <Button onClick={testTTS} variant={isSpeaking ? 'destructive' : 'outline'} className="w-full">
                  {isSpeaking ? '⏹ Stop Test' : '▶ Test Voice — Click to hear!'}
                </Button>
              </>
            )}
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="am" className="font-semibold">Audio Mode</Label><p className="text-xs text-muted-foreground">Prefer audio-based learning</p></div>
              <Switch id="am" checked={s.audioMode} onCheckedChange={v => up({ audioMode: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Focus & Reading */}
        <Card className="border-0 shadow-md">
          <CardHeader><CardTitle className="text-lg">🎯 Focus & Reading</CardTitle><CardDescription>Tools to help you concentrate</CardDescription></CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="fm" className="font-semibold">Focus Mode</Label><p className="text-xs text-muted-foreground">Dims non-essential UI elements</p></div>
              <Switch id="fm" checked={s.focusMode} onCheckedChange={v => up({ focusMode: v })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="rm" className="font-semibold">Reading Mode</Label><p className="text-xs text-muted-foreground">Narrow column for easier reading</p></div>
              <Switch id="rm" checked={s.readingMode} onCheckedChange={v => up({ readingMode: v })} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div><Label htmlFor="pn" className="font-semibold">Predictable Navigation</Label><p className="text-xs text-muted-foreground">Sidebar and layout never change position</p></div>
              <Switch id="pn" checked={s.predictableNavigation} onCheckedChange={v => up({ predictableNavigation: v })} />
            </div>
          </CardContent>
        </Card>

        {/* Pomodoro */}
        <Card className="border-0 shadow-md md:col-span-2">
          <CardHeader><CardTitle className="text-lg">⏱️ Pomodoro Timer</CardTitle><CardDescription>Short work sessions with breaks — great for Focus-Friendly</CardDescription></CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row items-start gap-6">
              <div className="flex items-center justify-between py-2 w-full md:w-auto">
                <div className="mr-4"><Label htmlFor="pe" className="font-semibold">Enable Pomodoro</Label><p className="text-xs text-muted-foreground">Shows timer on dashboard</p></div>
                <Switch id="pe" checked={s.pomodoroEnabled} onCheckedChange={v => up({ pomodoroEnabled: v })} />
              </div>
              {s.pomodoroEnabled && (
                <div className="flex gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Work (minutes)</Label>
                    <Input type="number" className="w-20 h-10" min={5} max={60} value={s.pomodoroWork} onChange={e => up({ pomodoroWork: parseInt(e.target.value) || 25 })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Break (minutes)</Label>
                    <Input type="number" className="w-20 h-10" min={1} max={30} value={s.pomodoroBreak} onChange={e => up({ pomodoroBreak: parseInt(e.target.value) || 5 })} />
                  </div>
                  <div className="flex items-end">
                    <p className="text-sm text-muted-foreground pb-2">💡 Focus-Friendly recommended: 15 work / 5 break</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
