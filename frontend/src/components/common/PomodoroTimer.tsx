import { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccessibilityStore } from '@/stores/accessibilityStore';

export default function PomodoroTimer() {
  const settings = useAccessibilityStore();
  const wk = settings.pomodoroWork || 25, brk = settings.pomodoroBreak || 5;
  const [left, setLeft] = useState(wk * 60);
  const [run, setRun] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [sessions, setSessions] = useState(0);
  const ref = useRef<any>(null);
  const total = (isBreak ? brk : wk) * 60;
  const pct = ((total - left) / total) * 100;

  useEffect(() => {
    if (run) ref.current = setInterval(() => setLeft(p => {
      if (p <= 1) { setRun(false); if (!isBreak) { setSessions(s => s + 1); setIsBreak(true); return brk * 60; } else { setIsBreak(false); return wk * 60; } }
      return p - 1;
    }), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, [run, isBreak, wk, brk]);

  const m = Math.floor(left / 60), s = left % 60;
  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference - (pct / 100) * circumference;

  return (
    <Card className="border-0 shadow-md overflow-hidden">
      <CardContent className="p-0">
        <div className={`p-6 ${isBreak ? 'bg-gradient-to-r from-green-50 to-emerald-50' : 'bg-gradient-to-r from-teal-50 to-emerald-50'}`}>
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Circular Timer */}
            <div className="relative w-28 h-28 shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/20" />
                <circle cx="50" cy="50" r="45" fill="none" strokeWidth="4" strokeLinecap="round"
                  className={isBreak ? 'text-green-500' : 'text-teal-500'}
                  stroke="currentColor"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashoffset}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-mono font-bold tabular-nums">{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
              </div>
            </div>

            {/* Info & Controls */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center gap-2 justify-center md:justify-start mb-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${isBreak ? 'bg-green-100 text-green-700' : 'bg-teal-100 text-teal-700'}`}>
                  {isBreak ? '☕ Break Time' : '🎯 Focus Time'}
                </span>
                <span className="text-xs text-muted-foreground">Sessions: {sessions}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                {isBreak ? 'Take a break! Stretch, hydrate, breathe.' : 'Stay focused. You\'re doing great!'}
              </p>
              <div className="flex gap-2 justify-center md:justify-start">
                <Button size="sm" onClick={() => setRun(!run)}
                  className={run ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white'}>
                  {run ? '⏸ Pause' : '▶ Start'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setRun(false); setIsBreak(false); setLeft(wk * 60); }}>
                  ↻ Reset
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
