import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gameAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import toast from 'react-hot-toast';
import SourceMaterialView from '@/components/reader/SourceMaterialView';

type Phase = 'setup' | 'playing' | 'feedback' | 'result' | 'reading';

// ===== TTS for quiz =====
const speakText = (text: string, speed: number = 1) => {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/[_]{2,}/g, 'blank'));
  u.rate = speed;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find(x => x.lang.startsWith('en') && x.name.includes('Google')) || voices.find(x => x.lang.startsWith('en'));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
};
const stopSpeak = () => window.speechSynthesis?.cancel();

// ===== Confetti burst =====
function ConfettiBurst() {
  const colors = ['#0d9488', '#14b8a6', '#f59e0b', '#10b981', '#ec4899', '#3b82f6'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {Array.from({ length: 50 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const size = Math.random() * 8 + 4;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const dur = Math.random() * 1.5 + 1;
        return (
          <div key={i} className="absolute rounded-full" style={{
            left: `${left}%`, top: '-10px', width: size, height: size, backgroundColor: color,
            animation: `confetti-fall ${dur}s ease-in ${delay}s forwards`,
          }} />
        );
      })}
      <style>{`@keyframes confetti-fall { 0% { transform: translateY(0) rotate(0deg); opacity:1; } 100% { transform: translateY(100vh) rotate(720deg); opacity:0; } }`}</style>
    </div>
  );
}

// ===== Encouragement messages =====
const encouragements = {
  correct: ['🎉 Amazing!', '⭐ You got it!', '🧠 Brilliant!', '🔥 On fire!', '💪 Superstar!', '✨ Perfect!', '🌟 Wonderful!', '🏆 Champion!'],
  wrong: ['💪 You\'ll get the next one!', '🌱 Learning is growing!', '📚 Now you know!', '🤔 Good try!', '🎯 Almost there!', '🧩 Piece by piece!'],
};
const getEncouragement = (correct: boolean) => {
  const arr = correct ? encouragements.correct : encouragements.wrong;
  return arr[Math.floor(Math.random() * arr.length)];
};

export default function GamePage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const { settings } = useAccessibilityStore();
  const ndType = user?.neurodivergentType || 'none';
  const ttsOn = settings.ttsEnabled;
  const ttsSpeed = settings.ttsSpeed || 1;

  const [phase, setPhase] = useState<Phase>('setup');
  const [tab, setTab] = useState('create');
  const [title, setTitle] = useState('');
  const [textContent, setTextContent] = useState('');
  const [questionCount, setQuestionCount] = useState('10');

  // Reader Customization States
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerY, setRulerY] = useState(0);
  const [readerFontScale, setReaderFontScale] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [readerLineSpacing, setReaderLineSpacing] = useState<'normal' | 'wide' | 'wider'>('normal');

  // Split-screen MCQ reader states
  const [showSourceMaterial, setShowSourceMaterial] = useState(false);
  const [enableRulerInMCQ, setEnableRulerInMCQ] = useState(true);

  // Game state
  const [game, setGame] = useState<any>(null);
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<any[]>([]);
  const [timer, setTimer] = useState(0);
  const [qTimer, setQTimer] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [encouragement, setEncouragement] = useState('');
  const [streak, setStreak] = useState(0);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [newLevel, setNewLevel] = useState<number>(1);
  const timerRef = useRef<any>(null);
  const uploadAbort = useRef<AbortController | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Queries
  const { data: myGames } = useQuery({ queryKey: ['myGames'], queryFn: async () => { const { data } = await gameAPI.getMyGames(); return data.data; } });
  const { data: recommendedGames } = useQuery({ queryKey: ['recommendedGames'], queryFn: async () => { const { data } = await gameAPI.getRecommended(); return data.data; } });
  const { data: history } = useQuery({ queryKey: ['gameHistory'], queryFn: async () => { const { data } = await gameAPI.getHistory(); return data.data; } });
  const { data: leaderboard } = useQuery({ queryKey: ['leaderboard'], queryFn: async () => { const { data } = await gameAPI.getLeaderboard(); return data.data; } });

  // Mutations
  const createPDF = useMutation({
    mutationFn: ({ fd, controller }: { fd: FormData; controller: AbortController }) => gameAPI.createFromPDF(fd, { signal: controller.signal, onUploadProgress: p => setUploadProgress(p.total ? Math.round((p.loaded / p.total) * 100) : 0) }),
    onSuccess: (res) => { toast.success('🎮 Game ready!'); qc.invalidateQueries({ queryKey: ['myGames'] }); startGame(res.data.data); },
    onError: (e: any) => toast.error(e.code === 'ERR_CANCELED' ? 'Upload cancelled.' : e.response?.data?.message || 'Upload failed. You can retry.'),
    onSettled: () => { uploadAbort.current = null; setUploadProgress(0); },
  });
  const createText = useMutation({
    mutationFn: (d: any) => gameAPI.createFromText(d),
    onSuccess: (res) => { toast.success('🎮 Game ready!'); qc.invalidateQueries({ queryKey: ['myGames'] }); startGame(res.data.data); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });
  const submitMut = useMutation({
    mutationFn: (d: any) => gameAPI.submit(d),
    onSuccess: (res) => { 
      setResult(res.data.data); 
      setPhase('result'); 
      setShowConfetti(res.data.data.accuracy >= 60); 
      qc.invalidateQueries({ queryKey: ['gameHistory', 'leaderboard'] }); 
      if (res.data.data.levelUp) {
        setNewLevel(res.data.data.newLevel || 1);
        setShowLevelUpModal(true);
      }
    },
  });

  // Timer
  useEffect(() => {
    if (phase === 'playing' || phase === 'feedback') {
      timerRef.current = setInterval(() => setTimer(p => p + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase]);

  // Auto-start quiz on redirect (e.g. from Weakness Log)
  useEffect(() => {
    const autoStartId = localStorage.getItem('autoStartGameId');
    if (autoStartId) {
      localStorage.removeItem('autoStartGameId');
      gameAPI.getGame(autoStartId).then(res => {
        startGame(res.data.data);
      }).catch(() => {
        toast.error('Failed to load quiz retry.');
      });
    }
  }, []);

  // Auto-read question aloud
  useEffect(() => {
    if (phase === 'playing' && ttsOn && game) {
      const q = game.questions[qIdx];
      if (q) {
        const optText = q.options.map((o: string, i: number) => `Option ${String.fromCharCode(65 + i)}: ${o}`).join('. ');
        speakText(`Question ${qIdx + 1}. ${q.question}. ${optText}`, ttsSpeed);
      }
    }
    return () => stopSpeak();
  }, [phase, qIdx, ttsOn, game, ttsSpeed]);

  const startGame = (g: any) => {
    setGame(g); setQIdx(0); setSelected(null); setAnswers([]); setTimer(0); setQTimer(0);
    setResult(null); setShowConfetti(false); setEncouragement(''); setStreak(0);
    setShowSourceMaterial(false);
    setPhase('playing'); setTab('play');
  };

  const selectAnswer = (idx: number) => { if (phase !== 'playing') return; setSelected(idx); };

  const confirmAnswer = () => {
    if (selected === null || !game) return;
    stopSpeak();
    const q = game.questions[qIdx];
    const correct = selected === q.correctAnswer;
    const newStreak = correct ? streak + 1 : 0;
    setStreak(newStreak);
    setAnswers(prev => [...prev, { questionIndex: qIdx, selectedAnswer: selected, correct, timeTaken: qTimer }]);
    setEncouragement(getEncouragement(correct));
    setPhase('feedback');
    setQTimer(0);

    // Speak feedback
    if (ttsOn) {
      speakText(correct ? 'Correct! Well done!' : `Not quite. The answer is ${q.options[q.correctAnswer]}.`, ttsSpeed);
    }
  };

  const nextQuestion = () => {
    stopSpeak();
    if (!game) return;
    if (qIdx + 1 >= game.questions.length) {
      submitMut.mutate({ gameId: game._id, answers, timeTaken: timer });
      return;
    }
    setQIdx(p => p + 1); setSelected(null); setPhase('playing');
  };

  const handlePDF = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.type !== 'application/pdf' || !f.name.toLowerCase().endsWith('.pdf')) { toast.error('Choose a PDF file.'); e.target.value=''; return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('PDF must be 10 MB or smaller.'); e.target.value=''; return; }
    const fd = new FormData();
    fd.append('pdf', f); fd.append('title', title || `Quiz: ${f.name}`);
    fd.append('questionCount', questionCount);
    const controller = new AbortController(); uploadAbort.current = controller; setUploadProgress(0); createPDF.mutate({ fd, controller });
  };

  const handleText = () => {
    if (textContent.trim().length < 50) { toast.error('Add at least 50 characters'); return; }
    createText.mutate({ title: title || 'Quick Quiz', content: textContent, questionCount: parseInt(questionCount) || 10 });
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const q = game?.questions[qIdx];
  const progress = game ? ((qIdx + (phase === 'feedback' ? 1 : 0)) / game.questions.length) * 100 : 0;

  // Difficulty color/emoji
  const diffStyle = (d: string) => d === 'easy' ? { bg: 'bg-green-100 text-green-700', emoji: '🟢' } : d === 'hard' ? { bg: 'bg-red-100 text-red-700', emoji: '🔴' } : { bg: 'bg-yellow-100 text-yellow-700', emoji: '🟡' };

  // ===========================
  // ======= READING UI =======
  // ===========================
  if (phase === 'reading' && game) {
    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!rulerActive) return;
      const rect = e.currentTarget.getBoundingClientRect();
      // Calculate cursor Y relative to the container element
      setRulerY(e.clientY - rect.top);
    };

    const fontCls = readerFontScale === 'xlarge' ? 'text-2xl' : readerFontScale === 'large' ? 'text-xl' : 'text-lg';
    const spacingCls = readerLineSpacing === 'wider' ? 'leading-loose' : readerLineSpacing === 'wide' ? 'leading-relaxed' : 'leading-normal';

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-fade-in-up">
        <Card className="border-0 shadow-xl overflow-hidden">
          {/* Header */}
          <CardHeader className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-t-xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">📄 Advanced Document Reader</CardTitle>
                <CardDescription className="text-teal-50 font-medium">{game.title}</CardDescription>
              </div>
              <Button variant="secondary" className="hover:bg-slate-100" onClick={() => { stopSpeak(); setPhase('setup'); }}>← Back to setup</Button>
            </div>
          </CardHeader>

          {/* Reader Accessibility Toolbar */}
          <div className="bg-slate-50 border-b p-4 flex flex-wrap items-center justify-between gap-4 text-sm font-medium text-slate-700">
            {/* Reading Ruler Toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer bg-white border px-3 py-1.5 rounded-lg shadow-sm hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  checked={rulerActive} 
                  onChange={(e) => setRulerActive(e.target.checked)} 
                  className="accent-teal-600 cursor-pointer h-4 w-4"
                />
                <span>📏 Reading Ruler</span>
              </label>
              <span className="text-xs text-muted-foreground hidden md:inline">Fits line tracking</span>
            </div>

            {/* Font Size controls */}
            <div className="flex items-center gap-2">
              <span>Font Size:</span>
              <div className="inline-flex rounded-lg border bg-white p-0.5 shadow-sm">
                {[
                  { value: 'normal' as const, label: 'A', title: 'Normal size' },
                  { value: 'large' as const, label: 'A+', title: 'Large size' },
                  { value: 'xlarge' as const, label: 'A++', title: 'Extra Large' },
                ].map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => setReaderFontScale(opt.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${readerFontScale === opt.value ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-slate-100'}`}
                    title={opt.title}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Line Spacing controls */}
            <div className="flex items-center gap-2">
              <span>Spacing:</span>
              <div className="inline-flex rounded-lg border bg-white p-0.5 shadow-sm">
                {[
                  { value: 'normal' as const, label: '1.6x', title: 'Normal spacing' },
                  { value: 'wide' as const, label: '1.9x', title: 'Wide spacing' },
                  { value: 'wider' as const, label: '2.3x', title: 'Extra Wide' },
                ].map(opt => (
                  <button 
                    key={opt.value}
                    onClick={() => setReaderLineSpacing(opt.value)}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${readerLineSpacing === opt.value ? 'bg-teal-600 text-white shadow-sm' : 'hover:bg-slate-100'}`}
                    title={opt.title}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reader Content Body */}
          <CardContent className="p-6 md:p-8 relative">
            <div 
              className="relative select-text" 
              onMouseMove={handleMouseMove}
            >
              {/* Vertical focus ruler highlighting bar */}
              {rulerActive && (
                <div 
                  className="absolute left-0 right-0 h-8 bg-amber-400/20 border-y border-amber-500/40 pointer-events-none transition-all duration-75 ease-out z-10"
                  style={{ top: `${rulerY - 16}px` }}
                />
              )}

              {/* Chunk Content Render */}
              <div className="space-y-6">
                {game.sourceChunks && game.sourceChunks.length > 0 ? (
                  game.sourceChunks.map((chunk: string, i: number) => (
                    <div 
                      key={i} 
                      className={`group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-teal-100 hover:bg-slate-50/50 transition-all ${fontCls} ${spacingCls}`}
                    >
                      <div className="flex-1 text-slate-800 leading-relaxed">
                        {chunk}
                      </div>
                      
                      {/* TTS controls per chunk */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => speakText(chunk, ttsSpeed)} 
                          className="h-8 w-8 hover:bg-teal-50 hover:text-teal-600 text-slate-500 rounded-full"
                          title="Read paragraph aloud"
                        >
                          🔊
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={stopSpeak} 
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600 text-slate-500 rounded-full"
                          title="Stop playing"
                        >
                          ⏹
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={`p-4 text-slate-800 ${fontCls} ${spacingCls}`}>
                    {game.sourceContent || "No source content available for this quiz."}
                  </div>
                )}
              </div>
            </div>

            {/* Complete buttons */}
            <div className="mt-8 pt-6 border-t flex flex-wrap justify-center gap-4">
              <Button variant="outline" size="lg" onClick={() => { stopSpeak(); setPhase('setup'); }}>Done Reading</Button>
              <Button size="lg" className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold" onClick={() => { stopSpeak(); startGame(game); }}>▶ Start Play Quiz</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===========================
  // ======= PLAYING UI =======
  // ===========================
  if ((phase === 'playing' || phase === 'feedback') && game && q) {
    const ds = diffStyle(q.difficulty);

    const chunksPayload = (game.sourceChunks || []).map((text: string, index: number) => ({
      chunkId: String(index),
      textSegment: text,
      pageOffset: index + 1,
    }));

    const activeChunkId = chunksPayload.length > 0 ? String(qIdx % chunksPayload.length) : undefined;

    return (
      <div className={`mx-auto space-y-5 pb-10 transition-all duration-300 ${showSourceMaterial ? 'max-w-7xl' : 'max-w-3xl'}`}>
        {/* Top bar */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-white/20 text-white border-0 text-lg px-3 py-1 font-bold">
                  {qIdx + 1}/{game.questions.length}
                </Badge>
                {streak >= 2 && <Badge className="bg-amber-400 text-amber-900 border-0 animate-bounce">🔥 {streak} streak!</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className={`border-0 ${ds.bg}`}>{ds.emoji} {q.difficulty} • {q.points}pts</Badge>
                <div className="text-lg font-mono font-bold bg-white/20 rounded-lg px-3 py-1">⏱ {fmt(timer)}</div>
              </div>
            </div>
            <Progress value={progress} className="mt-3 h-2.5 bg-white/20" indicatorClassName="bg-white rounded-full" />
          </CardContent>
        </Card>

        <div className={`grid gap-6 ${showSourceMaterial ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
          {/* Question Card */}
          <Card className={`border-0 shadow-xl transition-all ${phase === 'feedback' ? (answers[answers.length - 1]?.correct ? 'ring-4 ring-green-400/50' : 'ring-4 ring-red-400/50') : ''}`}>
            <CardContent className="p-6 md:p-8">
              {/* Question text */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <h2 className="text-lg md:text-xl font-bold whitespace-pre-line leading-relaxed flex-1">{q.question}</h2>
                {ttsOn && (
                  <Button size="icon" variant="ghost" onClick={() => speakText(q.question, ttsSpeed)} className="shrink-0" title="Read question aloud">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M17.95 6.05a8 8 0 010 11.9M6.5 8.8l5.7-4.2c.4-.3.8-.1.8.4v14c0 .5-.4.7-.8.4L6.5 15.2H4c-.6 0-1-.4-1-1v-4.4c0-.6.4-1 1-1h2.5z" /></svg>
                  </Button>
                )}
              </div>

              {/* Options */}
              <div className="space-y-3">
                {q.options.map((opt: string, i: number) => {
                  const letter = String.fromCharCode(65 + i);
                  let cls = 'border-2 p-4 rounded-2xl transition-all duration-200 w-full text-left flex items-center gap-4 ';
                  let circleCls = 'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ';

                  if (phase === 'feedback') {
                    if (i === q.correctAnswer) {
                      cls += 'border-green-500 bg-green-50 scale-[1.02] shadow-md ';
                      circleCls += 'bg-green-500 text-white ';
                    } else if (i === selected && i !== q.correctAnswer) {
                      cls += 'border-red-400 bg-red-50 opacity-80 ';
                      circleCls += 'bg-red-500 text-white ';
                    } else {
                      cls += 'border-muted opacity-40 ';
                      circleCls += 'bg-muted ';
                    }
                  } else {
                    cls += selected === i
                      ? 'border-teal-500 bg-teal-50 shadow-lg scale-[1.02] ring-2 ring-teal-300 cursor-pointer '
                      : 'border-muted hover:border-teal-300 hover:bg-teal-50/50 hover:shadow cursor-pointer ';
                    circleCls += selected === i ? 'bg-teal-500 text-white ' : 'bg-muted ';
                  }

                  return (
                    <button key={i} onClick={() => selectAnswer(i)} className={cls} disabled={phase === 'feedback'}>
                      <div className={circleCls}>
                        {phase === 'feedback' && i === q.correctAnswer ? '✓' : phase === 'feedback' && i === selected && i !== q.correctAnswer ? '✗' : letter}
                      </div>
                      <span className="flex-1 text-left">{opt}</span>
                      {ttsOn && phase === 'playing' && (
                        <button type="button" onClick={(e) => { e.stopPropagation(); speakText(`Option ${letter}: ${opt}`, ttsSpeed); }}
                          className="text-muted-foreground hover:text-foreground p-1 shrink-0" title={`Read option ${letter}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m-8.036-3.536h-3a1 1 0 01-1-1v-4a1 1 0 011-1h3l5-4v14l-5-4z" /></svg>
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback area */}
              {phase === 'feedback' && (
                <div className={`mt-6 p-5 rounded-2xl text-center ${answers[answers.length - 1]?.correct ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200'}`}>
                  <p className="text-2xl font-bold mb-1">{encouragement}</p>
                  <p className="text-sm text-muted-foreground">{q.explanation}</p>
                  {streak >= 3 && <p className="text-sm font-bold text-amber-600 mt-2">🔥 {streak} correct in a row! Keep going!</p>}
                </div>
              )}

              {/* Buttons */}
              <div className="flex justify-between items-center flex-wrap gap-3 mt-6">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { stopSpeak(); setPhase('setup'); setTab('create'); }}>✕ Quit</Button>
                  {chunksPayload.length > 0 && (
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setShowSourceMaterial(!showSourceMaterial)}
                      className="border-teal-600/30 text-teal-600 hover:text-teal-700 hover:bg-teal-50/50 flex items-center gap-1.5"
                    >
                      {showSourceMaterial ? '📖 Hide Source' : '📄 Read Source Material'}
                    </Button>
                  )}
                </div>
                {phase === 'playing' ? (
                  <Button onClick={confirmAnswer} disabled={selected === null} className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 text-base">
                    {selected === null ? 'Pick an answer ☝️' : 'Lock In Answer ✓'}
                  </Button>
                ) : (
                  <Button onClick={nextQuestion} className="bg-gradient-to-r from-teal-600 to-emerald-600 px-8 text-base">
                    {qIdx + 1 >= game.questions.length ? '🏁 See Results' : 'Next Question →'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Inline Source Material Reader */}
          {showSourceMaterial && (
            <div className="space-y-4">
              <Card className="border-0 shadow-xl bg-slate-900 border-slate-800 text-white p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-teal-400">
                    <span>📄 Inline Source Material Reader</span>
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs hover:bg-slate-800 transition-colors">
                    <input
                      type="checkbox"
                      checked={enableRulerInMCQ}
                      onChange={(e) => setEnableRulerInMCQ(e.target.checked)}
                      className="accent-teal-600 cursor-pointer h-4 w-4 animate-none"
                    />
                    <span>📏 Focus Ruler</span>
                  </label>
                </div>
                {chunksPayload.length > 0 ? (
                  <SourceMaterialView
                    chunks={chunksPayload}
                    activeChunkId={activeChunkId}
                    enableFocusRuler={enableRulerInMCQ}
                  />
                ) : (
                  <p className="text-slate-400 text-sm">No source material chunks available for this quiz.</p>
                )}
              </Card>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===========================
  // ======= RESULT UI ========
  // ===========================
  if (phase === 'result' && result) {
    const acc = result.accuracy || 0;
    return (
      <div className="max-w-2xl mx-auto space-y-6 pb-10">
        {showConfetti && <ConfettiBurst />}
        <Card className="border-0 shadow-xl overflow-hidden">
          <div className={`p-10 text-center text-white ${acc >= 80 ? 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-600' : acc >= 50 ? 'bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500' : 'bg-gradient-to-br from-red-500 via-pink-500 to-rose-600'}`}>
            <div className="text-7xl mb-4">{acc >= 80 ? '🏆' : acc >= 50 ? '⭐' : '💪'}</div>
            <h2 className="text-4xl font-extrabold mb-2">{acc >= 80 ? 'Amazing!' : acc >= 50 ? 'Good Job!' : 'Keep Practicing!'}</h2>
            <p className="text-lg opacity-90">{acc >= 80 ? 'You really know this topic!' : acc >= 50 ? 'You\'re getting there!' : 'Every attempt makes you smarter!'}</p>
          </div>
          <CardContent className="p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { label: 'Score', value: `${result.score}/${result.totalPoints}`, icon: '🎯', color: 'bg-teal-50' },
                { label: 'Accuracy', value: `${acc}%`, icon: '📊', color: 'bg-blue-50' },
                { label: 'Time', value: fmt(result.session?.timeTaken || timer), icon: '⏱', color: 'bg-amber-50' },
                { label: 'XP Earned', value: `+${result.xpEarned}`, icon: '✨', color: 'bg-green-50' },
              ].map(s => (
                <div key={s.label} className={`text-center p-4 rounded-2xl ${s.color}`}>
                  <div className="text-3xl mb-1">{s.icon}</div>
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Explanations for wrong answers */}
            {game && answers.some(a => !a.correct) && (
              <div className="mb-8 text-left">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">📝 What to review:</h3>
                <div className="space-y-3">
                  {answers.filter(a => !a.correct).map((a, i) => {
                    const q = game.questions[a.questionIndex];
                    return (
                      <div key={i} className="p-4 rounded-xl bg-red-50 border border-red-100">
                        <p className="font-semibold text-sm mb-1">{q.question}</p>
                        <p className="text-xs text-muted-foreground mb-2">You selected: <span className="text-red-600 line-through">{q.options[a.selectedAnswer]}</span></p>
                        <p className="text-sm font-medium text-green-700 bg-green-100/50 p-2 rounded">{q.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Next Recommended Step */}
            <div className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-left">
              <h3 className="font-bold text-blue-900 mb-1">🎯 Next Recommended Step</h3>
              <p className="text-sm text-blue-800">
                {acc >= 80 ? 'You mastered this! Try creating a harder quiz on a new topic.' : acc >= 50 ? 'Review the mistakes above and try this quiz one more time to lock it in.' : 'Let\'s break this down. Try reading the source material again with Focus Mode enabled.'}
              </p>
            </div>

            <div className="flex gap-3 justify-center flex-wrap">
              <Button variant="outline" onClick={() => { setPhase('setup'); setTab('create'); }}>← Create New Quiz</Button>
              {game && <Button className="bg-gradient-to-r from-teal-600 to-emerald-600" onClick={() => startGame(game)}>🔄 Play Again</Button>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ===========================
  // ==== SETUP / BROWSE UI ====
  // ===========================
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">🎮 <span className="gradient-text">Learn & Play</span></h1>
        <p className="text-muted-foreground">Upload notes or PDF → choose how many questions → play quiz → earn XP!</p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="create">✨ Create Quiz</TabsTrigger>
          <TabsTrigger value="my-games">My Quizzes ({myGames?.length || 0})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="leaderboard">🏆 Leaderboard</TabsTrigger>
        </TabsList>

        {/* ===== CREATE ===== */}
        <TabsContent value="create" className="space-y-6">
          {/* Question count selector — shared between both methods */}
          <Card className="border-2 border-dashed border-teal-300 bg-gradient-to-r from-teal-50 to-emerald-50 shadow-none">
            <CardContent className="p-5">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📝</span>
                  <div>
                    <p className="font-bold">How many questions do you want?</p>
                    <p className="text-xs text-muted-foreground">Pick a number, then upload PDF or paste notes below</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger className="w-44 h-12 bg-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Questions (Quick)</SelectItem>
                      <SelectItem value="10">10 Questions</SelectItem>
                      <SelectItem value="15">15 Questions</SelectItem>
                      <SelectItem value="20">20 Questions (Full)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {/* Title */}
              <div className="mt-4">
                <Label className="text-sm">Quiz Title (optional)</Label>
                <Input placeholder="e.g. Biology Chapter 5 Quiz" value={title} onChange={e => setTitle(e.target.value)} className="mt-1 bg-white" />
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            {/* From PDF */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-teal-50 to-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">📄 From PDF / Document</CardTitle>
                <CardDescription>Upload any study material PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-teal-200 rounded-xl p-6 text-center hover:border-teal-400 transition-colors">
                  <span className="text-4xl block mb-2">📎</span>
                  <p className="text-sm text-muted-foreground mb-3">Click to select a PDF file</p>
                  <Input type="file" accept="application/pdf,.pdf" onChange={handlePDF} disabled={createPDF.isPending} className="mx-auto max-w-xs" /><p className="mt-2 text-xs text-muted-foreground">PDF only, maximum 10 MB. Files remain private unless explicitly published.</p>{createPDF.isPending && <div className="mt-3 space-y-2"><Progress value={uploadProgress} /><Button type="button" size="sm" variant="outline" onClick={() => uploadAbort.current?.abort()}>Cancel upload</Button></div>}
                </div>
                {createPDF.isPending && (
                  <div className="flex items-center justify-center gap-2 text-sm text-teal-600 p-3 bg-teal-50 rounded-xl">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Reading PDF and generating {questionCount} questions...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* From Text */}
            <Card className="border-0 shadow-md hover:shadow-xl transition-all bg-gradient-to-br from-blue-50 to-cyan-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">📝 From Notes / Text</CardTitle>
                <CardDescription>Paste your study notes below</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea rows={6} placeholder="Paste your notes, textbook content, or any study material here... (min 50 characters)" value={textContent} onChange={e => setTextContent(e.target.value)} className="resize-none" />
                <div className="flex items-center justify-between">
                  <p className={`text-xs ${textContent.length >= 50 ? 'text-green-600' : 'text-muted-foreground'}`}>
                    {textContent.length}/50 characters {textContent.length >= 50 ? '✓ Ready' : '(need more)'}
                  </p>
                  <Button className="bg-gradient-to-r from-blue-500 to-cyan-500" onClick={handleText} disabled={createText.isPending || textContent.length < 50}>
                    {createText.isPending ? '🔄 Generating...' : `🎮 Create ${questionCount}-Question Quiz`}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* How AI Generates Quizzes (Explainer Accordion) */}
          <Card className="border border-teal-100 bg-teal-50/20 shadow-none">
            <CardContent className="p-5">
              <details className="group">
                <summary className="font-bold text-teal-800 cursor-pointer flex items-center justify-between list-none">
                  <span className="flex items-center gap-2">🧠 How does our AI generate quizzes from your files?</span>
                  <span className="transition-transform group-open:rotate-180 text-xl font-bold">↓</span>
                </summary>
                <div className="mt-4 space-y-4 text-sm text-teal-900 border-t border-teal-100 pt-4 leading-relaxed">
                  <div className="flex gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <p className="font-bold text-teal-900">1. Text Extraction & Chunking</p>
                      <p className="text-teal-700">The AI reads your uploaded PDF or notes, cleans the syntax, and splits the content into structured blocks of 1,500 characters to prevent cognitive fatigue.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">🔍</span>
                    <div>
                      <p className="font-bold text-teal-900">2. Term Frequency Analysis</p>
                      <p className="text-teal-700">We scan the document to identify key vocabulary and terms. These high-importance words are then used to build realistic distractor options (wrong answers) for your questions.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">✏️</span>
                    <div>
                      <p className="font-bold text-teal-900">3. Contextual Sentence Blanks</p>
                      <p className="text-teal-700">Instead of abstract questions, the AI selects representative sentences and replaces target keywords with blanks, helping you practice recognition inside context.</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <span className="text-xl">📈</span>
                    <div>
                      <p className="font-bold text-teal-900">4. Spaced Repetition (SuperMemo SM-2) & Adaptive Pacing</p>
                      <p className="text-teal-700">The app adjusts baseline difficulty (Easy/Medium/Hard) of new questions by matching your historical accuracy score. The system automatically schedules your next review date to maximize memory retention.</p>
                    </div>
                  </div>
                </div>
              </details>
            </CardContent>
          </Card>

          {/* Accessibility tip */}
          {(ndType === 'focus' || ndType === 'reading') && (
            <div className={`p-4 rounded-xl border-2 ${ndType === 'focus' ? 'border-blue-200 bg-blue-50' : 'border-green-200 bg-green-50'}`}>
              <p className="font-bold text-sm">{ndType === 'focus' ? '🎯 Focus Tip' : '📖 Reading Tip'}</p>
              <p className="text-sm text-muted-foreground">
                {ndType === 'focus'
                  ? 'Start with 5 questions for quick wins! Short quizzes keep focus high. You earn XP for every game! 🏆'
                  : 'Voice is enabled — each question will be read aloud automatically. Use the 🔊 buttons to replay any text.'}
              </p>
            </div>
          )}
        </TabsContent>

        {/* ===== MY GAMES ===== */}
        <TabsContent value="my-games" className="space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Your Quizzes</h2>
            {(myGames || []).length === 0 ? (
              <Card className="border-2 border-dashed"><CardContent className="py-16 text-center"><span className="text-6xl block mb-4">🎮</span><h3 className="text-xl font-bold mb-2">No quizzes yet!</h3><p className="text-muted-foreground mb-4">Create your first quiz from notes or a PDF</p><Button onClick={() => setTab('create')} className="bg-gradient-to-r from-teal-600 to-emerald-600">✨ Create Quiz</Button></CardContent></Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myGames.map((g: any) => (
                  <Card key={g._id} className="border-0 shadow-md hover:shadow-xl transition-all stat-card">
                    <CardContent className="p-6">
                      <div className="text-4xl mb-3 cursor-pointer" onClick={async () => {
                        try { const { data } = await gameAPI.getGame(g._id); startGame(data.data); } catch { toast.error('Failed to load'); }
                      }}>🎮</div>
                      <h3 className="font-bold text-lg mb-1">{g.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{g.totalQuestions} questions</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={async () => {
                          try { const { data } = await gameAPI.getGame(g._id); setGame(data.data); setPhase('reading'); } catch { toast.error('Failed to load'); }
                        }}>📄 Read</Button>
                        <Button size="sm" className="flex-1 bg-gradient-to-r from-teal-600 to-emerald-600" onClick={async () => {
                          try { const { data } = await gameAPI.getGame(g._id); startGame(data.data); } catch { toast.error('Failed to load'); }
                        }}>▶ Play</Button>
                        <Button size="sm" variant="destructive" onClick={async () => { if (!window.confirm('Delete this quiz and its saved sessions?')) return; try { await gameAPI.deleteGame(g._id); toast.success('Quiz deleted.'); qc.invalidateQueries({ queryKey: ['myGames'] }); } catch { toast.error('Could not delete quiz.'); } }}>Delete</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Quizzes (Collaborative Filtering) */}
          {recommendedGames && recommendedGames.length > 0 && (
            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🌟 Recommended for You</h2>
              <p className="text-sm text-muted-foreground mb-4">Quizzes created by users with similar profiles</p>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recommendedGames.map((g: any) => (
                  <Card key={g._id} className="border-0 shadow-md hover:shadow-xl transition-all stat-card bg-gradient-to-br from-violet-50 to-fuchsia-50">
                    <CardContent className="p-6">
                      <div className="text-4xl mb-3 cursor-pointer" onClick={async () => {
                        try { const { data } = await gameAPI.getGame(g._id); startGame(data.data); } catch { toast.error('Failed to load'); }
                      }}>💡</div>
                      <h3 className="font-bold text-lg mb-1">{g.title}</h3>
                      <p className="text-xs text-violet-600 font-semibold mb-1">By: {g.userId?.name} ({g.userId?.neurodivergentType})</p>
                      <p className="text-sm text-muted-foreground mb-4">{g.totalQuestions} questions</p>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={async () => {
                          try { const { data } = await gameAPI.getGame(g._id); setGame(data.data); setPhase('reading'); } catch { toast.error('Failed to load'); }
                        }}>📄 Read</Button>
                        <Button size="sm" className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white" onClick={async () => {
                          try { const { data } = await gameAPI.getGame(g._id); startGame(data.data); } catch { toast.error('Failed to load'); }
                        }}>▶ Play</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ===== HISTORY ===== */}
        <TabsContent value="history" className="space-y-3">
          {(history || []).length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><span className="text-4xl block mb-2">📊</span>Play a quiz to see your history here!</CardContent></Card>
          ) : history.map((s: any) => (
            <Card key={s._id} className="border-0 shadow-sm hover:shadow-md transition-all">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg ${s.accuracy >= 80 ? 'bg-green-500' : s.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>{s.accuracy}%</div>
                  <div>
                    <p className="font-bold">{(s.gameId as any)?.title || 'Quiz'}</p>
                    <p className="text-xs text-muted-foreground">Score: {s.score}/{s.totalPoints} • +{s.xpEarned} XP • {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* ===== LEADERBOARD ===== */}
        <TabsContent value="leaderboard">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle>🏆 Top Players</CardTitle></CardHeader>
            <CardContent>
              {(leaderboard || []).length === 0 ? (
                <div className="py-12 text-center"><span className="text-5xl block mb-3">🏆</span><p className="text-muted-foreground">Play a quiz to appear here!</p></div>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((l: any, i: number) => (
                    <div key={l._id} className={`flex items-center gap-4 p-4 rounded-2xl ${i === 0 ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-2 border-amber-200' : i < 3 ? 'bg-muted/50' : ''}`}>
                      <span className="text-3xl w-10 text-center">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</span>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-bold">{l.name?.charAt(0) || '?'}</div>
                      <div className="flex-1"><p className="font-bold">{l.name}</p><p className="text-xs text-muted-foreground">{l.gamesPlayed} games • {l.avgAccuracy}% avg</p></div>
                      <span className="text-xl font-extrabold gradient-text">{l.totalScore}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Level Up Modal */}
      {showLevelUpModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-md w-full border-0 shadow-2xl bg-gradient-to-b from-teal-50 to-emerald-50 text-center p-8 animate-fade-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
              <div className="absolute top-0 -left-4 w-24 h-24 bg-violet-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
              <div className="absolute top-0 -right-4 w-24 h-24 bg-fuchsia-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
            </div>
            <div className="relative z-10 space-y-6">
              <div className="text-7xl animate-bounce">🌟</div>
              <h2 className="text-3xl font-extrabold text-teal-900">LEVEL UP!</h2>
              <p className="text-muted-foreground text-sm">Your learning velocity is off the charts!</p>
              
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white flex items-center justify-center text-4xl font-extrabold mx-auto shadow-lg shadow-teal-500/30">
                {newLevel}
              </div>
              
              <p className="text-sm font-semibold text-teal-800">
                You reached Level {newLevel}! You've unlocked custom style rewards in the shop!
              </p>

              <div className="flex flex-col gap-2 pt-4">
                <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 font-semibold" onClick={() => { setShowLevelUpModal(false); stopSpeak(); }}>
                  Awesome, Keep Going! ✨
                </Button>
                <Button variant="ghost" onClick={() => { setShowLevelUpModal(false); stopSpeak(); window.location.pathname = '/dashboard'; }}>
                  Go to Rewards Store 🎁
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
