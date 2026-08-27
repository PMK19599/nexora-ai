import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { useAccessibilityStore } from '@/stores/accessibilityStore';
import { reviewAPI, groupAPI, tutorAPI, topicAPI, gameAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import PomodoroTimer from '@/components/common/PomodoroTimer';
import SpeakButton from '@/components/common/SpeakButton';
import { useTTS } from '@/hooks/useTTS';
import { useState } from 'react';
import DiagnosticTest from '@/components/diagnostic/DiagnosticTest';
import toast from 'react-hot-toast';

const COLORS = ['#0d9488', '#14b8a6', '#8b5cf6', '#a78bfa', '#c4b5fd'];

// Tips and encouragement per neurodivergent type
const ndTips: Record<string, { greeting: string; tips: string[]; emoji: string }> = {
  focus: {
    greeting: "Your Focus-Friendly dashboard is ready!",
    emoji: "🎯",
    tips: [
      "💡 Use the Pomodoro timer below — 15 min focus bursts work best!",
      "🎮 Try 'Learn & Play' — games help active minds learn faster",
      "⭐ Earn XP for every activity — collect them all!",
      "🔔 We'll nudge you gently when it's time to review",
    ]
  },
  predictable: {
    greeting: "Your structured, predictable dashboard is ready.",
    emoji: "🧩",
    tips: [
      "📋 Everything is in the same place every time — the sidebar never changes",
      "📅 Study Groups have fixed weekly schedules you can rely on",
      "🔇 Animations are turned off for a calm experience",
      "📖 Use 'Spaced Review' for a structured study routine",
    ]
  },
  reading: {
    greeting: "Your reading-friendly dashboard is ready!",
    emoji: "📖",
    tips: [
      "🔊 Click any 'Listen' button to hear text read aloud",
      "🔤 Your reading-friendly font is active for easier reading",
      "📏 Extra line spacing helps you track each line",
      "🎮 Try 'Learn & Play' — quiz games don't require much reading!",
    ]
  },
  none: {
    greeting: "Here's your learning overview for today.",
    emoji: "📊",
    tips: [
      "🧠 Start with 'Spaced Review' to build strong memory",
      "🚀 Set up your Career Path to get a personalized roadmap",
      "👥 Find a tutor for subjects you're struggling with",
      "🎮 Try 'Learn & Play' to test your knowledge with games!",
    ]
  },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const settings = useAccessibilityStore();
  const { speak, ttsEnabled } = useTTS();
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  const { data: stats } = useQuery({ queryKey: ['reviewStats'], queryFn: async () => { const { data } = await reviewAPI.getStats(); return data.data; } });
  const { data: groups } = useQuery({ queryKey: ['myGroups'], queryFn: async () => { const { data } = await groupAPI.getGroups(); return data.data; } });
  const { data: sessions } = useQuery({ queryKey: ['mySessions'], queryFn: async () => { const { data } = await tutorAPI.getSessions(); return data.data; } });
  const { data: progressDetails } = useQuery({ queryKey: ['progressDetails'], queryFn: async () => { const { data } = await topicAPI.getProgressDetails(); return data.data; } });

  const s = stats || { totalTopics: 0, masteredTopics: 0, dueTopics: 0, avgRetention: 0, avgMastery: 0, totalReviews: 0, topicBreakdown: [] };
  const bars = (s.topicBreakdown || []).slice(0, 6).map((t: any) => ({ name: t.topic?.substring(0, 12) || 'Topic', mastery: t.mastery || 0, retention: t.retention || 0 }));
  const pie = [{ name: 'Mastered', value: s.masteredTopics }, { name: 'Learning', value: Math.max(0, s.totalTopics - s.masteredTopics - s.dueTopics) }, { name: 'Due', value: s.dueTopics }].filter(d => d.value > 0);

  const ndType = user?.neurodivergentType || 'none';
  const nd = ndTips[ndType] || ndTips.none;
  const isNewUser = s.totalTopics === 0 && s.totalReviews === 0;
  const welcomeText = `Welcome back, ${user?.name?.split(' ')[0]}! ${nd.greeting}`;

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">
              Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>! {nd.emoji}
            </h1>
            {ttsEnabled && <SpeakButton text={welcomeText} />}
          </div>
          <p className="text-muted-foreground mt-1">{nd.greeting}</p>
        </div>
        <Link to="/review">
          <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 shadow-lg shadow-teal-500/25 font-semibold">
            {s.dueTopics > 0 ? `🔔 Review ${s.dueTopics} Due Topics` : '✅ Start Review'}
          </Button>
        </Link>
      </div>

      {/* Pomodoro for Focus-Friendly */}
      {ndType === 'focus' && <PomodoroTimer />}

      {/* ===== NEW USER ONBOARDING ===== */}
      {isNewUser && (
        <Card className="border-2 border-dashed border-teal-300 bg-gradient-to-br from-teal-50 to-emerald-50">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="text-5xl animate-float non-essential">🚀</div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
                  Welcome to Nexora AI! Let's get started
                  {ttsEnabled && <SpeakButton text="Welcome to Nexora AI! Here's how to get started. Step 1: Go to Learn and Play to create a quiz from your notes. Step 2: Upload a PDF or paste notes and play the quiz game. Step 3: Visit Career Path to plan your dream job roadmap. Step 4: Find a tutor if you need help with any subject." />}
                </h2>
                <p className="text-muted-foreground mb-4">Here's what you can do right now:</p>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    { to: '/games', icon: '🎮', title: 'Play a Learning Game', desc: 'Paste your notes or upload a PDF → instant quiz game!', color: 'bg-green-100 border-green-300 hover:bg-green-200' },
                    { to: '/career', icon: '🚀', title: 'Plan Your Career', desc: 'Enter your dream job → get a personalized study roadmap', color: 'bg-blue-100 border-blue-300 hover:bg-blue-200' },
                    { to: '/tutors', icon: '👥', title: 'Find a Tutor', desc: 'Browse expert tutors and book a session', color: 'bg-amber-100 border-amber-300 hover:bg-amber-200' },
                    { to: '/accessibility', icon: '♿', title: 'Customize Your Experience', desc: 'Change fonts, enable voice reading, set focus mode', color: 'bg-amber-100 border-amber-300 hover:bg-amber-200' },
                  ].map(item => (
                    <Link key={item.to} to={item.to}>
                      <div className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${item.color}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{item.icon}</span>
                          <div>
                            <p className="font-bold text-sm">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== ACCESSIBILITY TIPS ===== */}
      {ndType !== 'none' && (
        <Card className={`border-0 shadow-md overflow-hidden ${ndType === 'focus' ? 'bg-gradient-to-r from-blue-50 to-cyan-50' : ndType === 'predictable' ? 'bg-gradient-to-r from-amber-50 to-pink-50' : 'bg-gradient-to-r from-green-50 to-emerald-50'}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                💡 Tips just for you

                {ttsEnabled && <SpeakButton text={nd.tips.join('. ')} />}
              </h3>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              {nd.tips.map((tip, i) => (
                <div key={i} className="flex items-start gap-2 text-sm p-2 rounded-lg bg-white/60 backdrop-blur-sm">
                  <span className="text-base">{tip.split(' ')[0]}</span>
                  <span>{tip.split(' ').slice(1).join(' ')}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== DIAGNOSTIC PRE-TEST ===== */}
      {isNewUser && !showDiagnostic && (
        <Card className="border-0 shadow-xl bg-gradient-to-r from-violet-50 to-purple-50 hover:-translate-y-1 transition-transform">
          <CardContent className="p-5 flex flex-col md:flex-row items-center gap-4">
            <div className="text-4xl animate-blob non-essential">🔬</div>
            <div className="flex-1">
              <h3 className="font-bold text-lg text-violet-900">Diagnostic Learning Assessment</h3>
              <p className="text-sm text-violet-800">
                Want to personalize your experience even further? Take a quick 5-minute pre-test so Nexora AI can fine-tune the curriculum, pacing, and UI to perfectly match your cognitive profile!
              </p>
            </div>
            <Button className="bg-violet-600 hover:bg-violet-700 whitespace-nowrap shadow-lg shadow-violet-500/30" onClick={() => setShowDiagnostic(true)}>
              Start Assessment ✨
            </Button>
          </CardContent>
        </Card>
      )}

      {isNewUser && showDiagnostic && (
        <DiagnosticTest onComplete={() => {
          setShowDiagnostic(false);
          // Assuming the test handles profile updates
        }} />
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total Topics', value: s.totalTopics, sub: `${s.masteredTopics} mastered`, icon: '📚', gradient: 'from-teal-500 to-amber-600' },
          { label: 'Avg Retention', value: `${s.avgRetention}%`, sub: 'Memory strength', icon: '🧠', gradient: 'from-blue-500 to-cyan-600' },
          { label: 'Avg Mastery', value: `${s.avgMastery}%`, sub: 'Skill level', icon: '🏆', gradient: 'from-amber-500 to-orange-600' },
          { label: 'Total Reviews', value: s.totalReviews, sub: s.dueTopics > 0 ? `${s.dueTopics} due now!` : 'All caught up ✓', icon: '🔄', gradient: 'from-green-500 to-emerald-600' },
        ].map(card => (
          <Card key={card.label} className="stat-card overflow-hidden border-0 shadow-md">
            <CardContent className="p-0">
              <div className="flex items-stretch">
                <div className={`w-2 bg-gradient-to-b ${card.gradient}`} />
                <div className="flex-1 p-5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-muted-foreground">{card.label}</p>
                    <span className="text-2xl">{card.icon}</span>
                  </div>
                  <p className="text-3xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* XP Bar */}
      {user && (
        <Card className="border-0 shadow-md overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-600 text-white">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-3xl font-bold">{user.level}</div>
                <div><p className="text-sm text-amber-100">Level {user.level}</p><p className="text-2xl font-bold">{user.xp} XP</p></div>
              </div>
              <div className="flex-1 w-full">
                <div className="flex justify-between text-sm text-amber-100 mb-1"><span>Progress to Level {user.level + 1}</span><span>{user.xp % 500} / 500 XP</span></div>
                <div className="h-3 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${(user.xp % 500) / 5}%` }} /></div>
              </div>
              <div className="text-center px-4"><p className="text-2xl font-bold">{user.streak}</p><p className="text-xs text-amber-100">Day Streak 🔥</p></div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts (only if user has data) */}
      {bars.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="text-lg">📊 Topic Mastery</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bars}><CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" /><XAxis dataKey="name" fontSize={11} /><YAxis domain={[0, 100]} /><Tooltip /><Bar dataKey="mastery" fill="#0d9488" name="Mastery %" radius={[6, 6, 0, 0]} /><Bar dataKey="retention" fill="#a78bfa" name="Retention %" radius={[6, 6, 0, 0]} /></BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          {pie.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg">🎯 Status</CardTitle></CardHeader>
              <CardContent className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart><Pie data={pie} cx="50%" cy="50%" outerRadius={100} innerRadius={60} label dataKey="value" strokeWidth={0}>{pie.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ===== TOPIC EXPLORER & WEAKNESS LOG ===== */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Topic Explorer */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">🔍 Topic Mastery Explorer</CardTitle>
            <CardDescription>Review your memory strength and mastery on each topic</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {!progressDetails?.progress || progressDetails.progress.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <span className="text-4xl block mb-2">📚</span>
                No topics started yet. Play a game or review to begin tracking topic-by-topic progress!
              </div>
            ) : (
              progressDetails.progress.map((p: any) => (
                <div key={p._id} className="p-4 rounded-xl bg-slate-50 border hover:bg-slate-100/50 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">{p.topicId?.title || 'Unknown Topic'}</h4>
                      <p className="text-xs text-muted-foreground">{p.topicId?.domain || 'General'}</p>
                    </div>
                    <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                      {p.mastery}% Mastery
                    </Badge>
                  </div>
                  
                  {/* Progress Bars */}
                  <div className="space-y-2 mt-3">
                    <div className="flex justify-between text-xs">
                      <span>Memory Retention:</span>
                      <span className="font-bold">{p.retentionRate}%</span>
                    </div>
                    <Progress value={p.retentionRate} className="h-1.5 bg-slate-200" indicatorClassName="bg-teal-600" />
                  </div>
                  
                  {/* Actions: Re-quiz or Read associated notes */}
                  <div className="mt-4 flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:bg-teal-50" 
                      onClick={() => window.location.pathname = '/games'}>
                      🎮 Take Re-Quiz
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Weakness Log */}
        <Card className="border-0 shadow-md">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">⚠️ Weakness & Mistake Log</CardTitle>
            <CardDescription>Review questions you previously missed to reinforce knowledge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {!progressDetails?.weaknesses || progressDetails.weaknesses.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground text-sm">
                <span className="text-4xl block mb-2">🎯</span>
                No weaknesses logged! Keep playing quizzes to identify areas of improvement.
              </div>
            ) : (
              progressDetails.weaknesses.map((w: any, idx: number) => (
                <div key={idx} className="p-4 rounded-xl bg-red-50/50 border border-red-100 hover:bg-red-50 transition-colors">
                  <p className="text-xs font-bold text-red-700 mb-1">Missed in: {w.gameTitle}</p>
                  <p className="font-bold text-sm text-slate-800 mb-2">{w.question}</p>
                  
                  <div className="space-y-1 text-xs mb-3">
                    <p className="text-red-600"><span className="font-bold">Your answer:</span> {w.selectedAnswerText}</p>
                    <p className="text-green-700 font-bold"><span className="font-normal text-slate-600">Correct:</span> {w.correctAnswerText}</p>
                  </div>
                  
                  <p className="text-xs text-muted-foreground bg-white/70 p-2.5 rounded-lg border border-red-50">{w.explanation}</p>
                  
                  <div className="mt-3 flex justify-end">
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs" 
                      onClick={async () => {
                        try {
                          // Redirect to games page and start the game!
                          localStorage.setItem('autoStartGameId', w.gameId);
                          window.location.pathname = '/games';
                        } catch {
                          toast.error('Failed to load this quiz.');
                        }
                      }}
                    >
                      🔄 Retry Quiz
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { to: '/games', i: '🎮', t: 'Learn & Play', d: 'Quiz games from your notes', color: 'from-green-500/5 to-emerald-500/5 hover:from-green-500/15 hover:to-emerald-500/15' },
          { to: '/career', i: '🚀', t: 'Career Roadmap', d: 'Plan your dream career', color: 'from-blue-500/5 to-cyan-500/5 hover:from-blue-500/15 hover:to-cyan-500/15' },
          { to: '/tutors', i: '👥', t: 'Find a Tutor', d: sessions?.length ? `${sessions.length} sessions` : 'Expert help', color: 'from-amber-500/5 to-teal-500/5 hover:from-amber-500/15 hover:to-teal-500/15' },
          { to: '/groups', i: '📚', t: 'Study Groups', d: groups?.length ? `${groups.length} groups` : 'Join or create', color: 'from-orange-500/5 to-amber-500/5 hover:from-orange-500/15 hover:to-amber-500/15' },
        ].map(c => (
          <Link key={c.to} to={c.to}>
            <Card className={`border-0 shadow-md bg-gradient-to-br ${c.color} transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full`}>
              <CardContent className="flex items-center gap-4 p-6">
                <span className="text-4xl">{c.i}</span>
                <div className="flex-1"><h3 className="font-bold">{c.t}</h3><p className="text-sm text-muted-foreground">{c.d}</p></div>
                <svg className="w-5 h-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Learning Archive & Rewards Store */}
      <div className="grid gap-6 md:grid-cols-2">
        <LearningArchive />
        <RewardsStore />
      </div>
    </div>
  );
}

// Separate component to keep Dashboard clean
function LearningArchive() {
  const { data: history } = useQuery({ queryKey: ['gameHistory'], queryFn: async () => { const { data } = await import('@/services/api').then(m => m.gameAPI.getHistory()); return data.data; } });

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">📂 Learning Archive</CardTitle>
        <Link to="/games" className="text-sm font-semibold text-teal-600 hover:text-teal-800">View All →</Link>
      </CardHeader>
      <CardContent>
        {!history || history.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <span className="text-4xl block mb-2">📊</span>
            Play a quiz to build your learning history archive!
          </div>
        ) : (
          <div className="space-y-3 mt-4">
            {history.slice(0, 3).map((s: any) => (
              <div key={s._id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${s.accuracy >= 80 ? 'bg-green-500' : s.accuracy >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}>{s.accuracy}%</div>
                  <div>
                    <p className="font-bold text-sm">{(s.gameId as any)?.title || 'Quiz'}</p>
                    <p className="text-xs text-muted-foreground">Score: {s.score}/{s.totalPoints} • {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right hidden md:block">
                  <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">+{s.xpEarned} XP</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RewardsStore() {
  const { user, unlockReward } = useAuthStore();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const rewards = [
    { id: 'theme_cyberpunk', name: 'Cyberpunk Theme', desc: 'A neon-glowing cyberpunk contrast aesthetic.', cost: 150, icon: '🌆' },
    { id: 'theme_cosmic', name: 'Deep Space Theme', desc: 'Dark obsidian cosmic interface layout.', cost: 300, icon: '🌌' },
    { id: 'avatar_gold', name: 'Gold Profile Border', desc: 'Display a glowing gold ring around your avatar.', cost: 200, icon: '👑' },
    { id: 'music_lofi', name: 'Study Lo-Fi Beats', desc: 'Chill beats focus tracks background bundle.', cost: 250, icon: '🎵' },
    { id: 'avatar_robo_owl', name: 'Study Pet: Robo-Owl', desc: 'Cheering companion avatar to support focus.', cost: 500, icon: '🦉' }
  ];

  const handleUnlock = async (id: string, cost: number) => {
    try {
      setLoadingId(id);
      await unlockReward(id, cost);
      toast.success('Reward unlocked successfully! 🎉 Check Accessibility Settings to apply themes.');
    } catch (e: any) {
      toast.error(e.message || 'Failed to unlock reward');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Card className="border-0 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">🎁 XP Rewards Shop</CardTitle>
        <span className="text-xs text-muted-foreground font-semibold">Balance: {user?.xp || 0} XP</span>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {rewards.map(r => {
            const isUnlocked = user?.unlockedRewards?.includes(r.id);
            const canAfford = (user?.xp || 0) >= r.cost;

            return (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.icon}</span>
                  <div>
                    <p className="font-bold text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.desc}</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {isUnlocked ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Unlocked ✓</Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => handleUnlock(r.id, r.cost)}
                      disabled={!canAfford || loadingId !== null}
                      className={canAfford ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 text-white font-semibold' : 'bg-muted text-muted-foreground border'}
                    >
                      {loadingId === r.id ? '...' : `✨ ${r.cost} XP`}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
