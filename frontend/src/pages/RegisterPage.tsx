import { useState, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';

const getStrength = (p: string) => {
  let s = 0;
  if (p.length >= 6) s++;
  if (p.length >= 10) s++;
  if (/[A-Z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return s;
};

const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

export default function RegisterPage() {
  const [params] = useSearchParams();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [fd, setFd] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    learningTrack: params.get('track') === 'neurodivergent' ? 'neurodivergent' : 'normal',
    neurodivergentType: 'none',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    communicationStyle: 'text',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register, isLoading } = useAuthStore();
  const { applyPreset } = useAccessibilityStore();
  const nav = useNavigate();

  const u = (f: string, v: string) => { setFd(p => ({ ...p, [f]: v })); setErrors(p => { const n = { ...p }; delete n[f]; return n; }); };

  const strength = useMemo(() => getStrength(fd.password), [fd.password]);

  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!fd.name.trim()) errs.name = 'Name is required';
    const normalizedEmail = fd.email.trim().toLowerCase();
    if (!normalizedEmail) errs.email = 'Email is required';
    else if (normalizedEmail.length > 254 || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) errs.email = 'Enter a valid email';
    if (!fd.password) errs.password = 'Password is required';
    else if (fd.password.length < 8) errs.password = 'Must be at least 8 characters';
    else if (fd.password.length > 128) errs.password = 'Must be at most 128 characters';
    if (fd.password !== fd.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const goStep2 = () => { if (validateStep1()) setStep(2); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { confirmPassword: _confirm, ...payload } = fd;
      await register({ ...payload, name: fd.name.trim(), email: fd.email.trim().toLowerCase() });
      if (fd.learningTrack === 'neurodivergent' && fd.neurodivergentType !== 'none') {
        applyPreset(fd.neurodivergentType as any);
      }
      toast.success('Welcome to Nexora AI! 🧠✨');
      nav('/onboarding');
    } catch (err: any) {
      toast.error(err.message || 'Registration failed');
    }
  };

  const ndInfo: Record<string, { emoji: string; color: string; features: string[] }> = {
    adhd: { emoji: '🔵', color: 'from-blue-500 to-cyan-500', features: ['Focus mode with timer', 'Pomodoro (15 min)', 'Reduced distractions', 'Progress nudges'] },
    autism: { emoji: '🟣', color: 'from-amber-500 to-pink-500', features: ['Predictable navigation', 'Consistent layouts', 'No animations', 'Structured schedules'] },
    dyslexia: { emoji: '🟢', color: 'from-green-500 to-emerald-500', features: ['OpenDyslexic font', 'Text-to-speech', 'Wide line spacing', 'High contrast'] },
  };

  return (
    <main id="main-content" className="flex h-screen overflow-hidden auth-bg">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center relative overflow-hidden bg-gradient-to-br from-teal-600 via-emerald-600 to-cyan-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 right-10 w-80 h-80 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-amber-300 rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 text-center text-white px-12">
          <div className="text-8xl mb-6 animate-float">✦</div>
          <h1 className="text-4xl font-bold mb-4">Start Your Journey</h1>
          <p className="text-lg text-amber-100 mb-8 leading-relaxed">
            Join thousands of learners using AI to study smarter.
          </p>
          <div className="space-y-3 text-left max-w-sm mx-auto">
            {['🧠 AI Spaced Repetition', '🚀 Career Roadmaps', '👥 Peer Tutoring', '♿ Accessibility First'].map(f => (
              <div key={f} className="flex items-center gap-3 px-4 py-2 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10">
                <span className="text-sm">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <form onSubmit={submit} className="w-full max-w-md max-h-[calc(100dvh-32px)] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border-0 dark:bg-card/90 backdrop-blur-sm">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pt-6 pb-4 space-y-5">
            <div className="text-center pb-2">
              <div className="lg:hidden text-5xl mb-3 animate-float">✦</div>
              <h2 className="text-2xl font-bold gradient-text">Create Account</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {step === 1 ? 'Step 1 of 2 — Your credentials' : 'Step 2 of 2 — Personalize your experience'}
              </p>
              {/* Step indicator */}
              <div className="flex gap-2 justify-center mt-4">
                <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 1 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-muted'}`} />
                <div className={`h-1.5 w-16 rounded-full transition-all ${step >= 2 ? 'bg-gradient-to-r from-teal-500 to-emerald-500' : 'bg-muted'}`} />
              </div>
            </div>

            {step === 1 ? (
              <>
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-semibold">Full Name</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></span>
                    <Input id="name" name="name" required autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} placeholder="Your name" value={fd.name} onChange={e => u('name', e.target.value)} className={`pl-10 h-12 ${errors.name ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.name && <p id="name-error" role="alert" className="text-destructive text-xs">{errors.name}</p>}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="regEmail" className="text-sm font-semibold">Email Address</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" /></svg></span>
                    <Input id="regEmail" name="email" type="email" required autoComplete="email" maxLength={254} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'register-email-error' : undefined} placeholder="you@example.com" value={fd.email} onChange={e => u('email', e.target.value)} className={`pl-10 h-12 ${errors.email ? 'border-destructive' : ''}`} />
                  </div>
                  {errors.email && <p id="register-email-error" role="alert" className="text-destructive text-xs">{errors.email}</p>}
                </div>

                {/* Password with strength */}
                <div className="space-y-2">
                  <Label htmlFor="regPass" className="text-sm font-semibold">Password</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></span>
                    <Input id="regPass" name="password" required autoComplete="new-password" minLength={8} maxLength={128} aria-invalid={!!errors.password} aria-describedby={errors.password ? 'register-password-error' : 'register-password-hint'} type={showPassword ? 'text' : 'password'} placeholder="At least 8 characters" value={fd.password} onChange={e => u('password', e.target.value)} className={`pl-10 pr-12 h-12 ${errors.password ? 'border-destructive' : ''}`} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      {showPassword ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.879L21 21" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {errors.password && <p id="register-password-error" role="alert" className="text-destructive text-xs">{errors.password}</p>}
                  {/* Strength bar */}
                  {fd.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4].map(i => (
                          <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i < strength ? strengthColors[strength - 1] : 'bg-muted'}`} />
                        ))}
                      </div>
                      <p className={`text-xs ${strength <= 1 ? 'text-red-500' : strength <= 2 ? 'text-yellow-600' : strength <= 3 ? 'text-blue-500' : 'text-green-500'}`}>
                        {strengthLabels[Math.max(0, strength - 1)] || 'Very Weak'} — {strength < 3 ? 'Add uppercase, numbers, symbols' : 'Great password!'}
                      </p>
                    </div>
                  )}
                  {!fd.password && <p id="register-password-hint" className="text-muted-foreground text-xs">Use 8–128 characters. Long, unique passphrases are recommended.</p>}
                </div>
                <div className="space-y-2"><Label htmlFor="confirmPassword">Confirm password</Label><Input id="confirmPassword" name="confirmPassword" type="password" required autoComplete="new-password" value={fd.confirmPassword} onChange={e => u('confirmPassword', e.target.value)} aria-invalid={!!errors.confirmPassword} aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}/>{errors.confirmPassword && <p id="confirm-password-error" role="alert" className="text-destructive text-xs">{errors.confirmPassword}</p>}</div>
              </>
            ) : (
              <>
                {/* Learning Track */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Learning Track</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: 'normal', l: 'Standard', i: '📘', d: 'Career & exam focused' },
                      { v: 'neurodivergent', l: 'Accessible', i: '♿', d: 'ADHD, Autism, Dyslexia' },
                    ].map(t => (
                      <button key={t.v} type="button" onClick={() => u('learningTrack', t.v)}
                        className={`p-4 rounded-xl border-2 text-left transition-all ${fd.learningTrack === t.v ? 'border-primary bg-primary/5 shadow-md' : 'border-muted hover:border-primary/50'}`}>
                        <div className="text-2xl mb-1">{t.i}</div>
                        <div className="font-semibold text-sm">{t.l}</div>
                        <div className="text-xs text-muted-foreground">{t.d}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Neurodivergent type */}
                {fd.learningTrack === 'neurodivergent' && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">Which support preset would help you?</Label>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">You do not need a diagnosis to use these settings.</p>
                      {(['adhd', 'autism', 'dyslexia'] as const).map(t => (
                        <button key={t} type="button" onClick={() => u('neurodivergentType', t)}
                          className={`w-full p-3 rounded-xl border-2 text-left transition-all ${fd.neurodivergentType === t ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}>
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{ndInfo[t].emoji}</span>
                            <div className="flex-1">
                              <div className="font-semibold text-sm capitalize">{t}</div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {ndInfo[t].features.slice(0, 2).map(f => (
                                  <span key={f} className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted">{f}</span>
                                ))}
                              </div>
                            </div>
                            {fd.neurodivergentType === t && <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>}
                          </div>
                        </button>
                      ))}
                      <button type="button" onClick={() => u('neurodivergentType', 'none')} className={`w-full p-3 rounded-xl border-2 text-left ${fd.neurodivergentType === 'none' ? 'border-primary bg-primary/5' : 'border-muted'}`}>No preset — configure later</button>
                    </div>
                    {fd.neurodivergentType !== 'none' && (
                      <div className={`p-3 rounded-lg bg-gradient-to-r ${ndInfo[fd.neurodivergentType]?.color || ''} text-white text-sm`}>
                        ✨ We'll automatically enable: {ndInfo[fd.neurodivergentType]?.features.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Communication preference */}
                <div className="rounded-lg bg-muted p-3 text-sm"><p className="font-semibold">Communication preference</p><p className="text-muted-foreground">Nexora currently uses text-based guidance. Audio reading can be enabled later in Accessibility Settings.</p></div>
              </>
            )}
          </div>

          <div className="shrink-0 border-t bg-white dark:bg-card px-6 py-4">
            {step === 1 ? (
              <Button type="button" className="w-full h-12 text-base font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25" onClick={goStep2}>
                Continue →
              </Button>
            ) : (
              <div className="flex gap-3 mb-4">
                <Button type="button" variant="outline" className="flex-1 h-12" onClick={() => setStep(1)}>← Back</Button>
                <Button type="submit" className="flex-1 h-12 text-base font-semibold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg shadow-teal-500/25" disabled={isLoading}>
                  {isLoading ? <><svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>Creating...</> : 'Create Account 🚀'}
                </Button>
              </div>
            )}
            <p className="text-sm text-center text-muted-foreground mt-2">
              By creating an account, you agree to our <Link to="/terms" className="underline">Terms</Link> and acknowledge our <Link to="/privacy" className="underline">Privacy notice</Link>. <Link to="/support" className="underline">Help</Link><br/>Already have an account?{' '}
              <Link to="/login" className="text-primary font-semibold hover:underline">Sign in →</Link>
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}
