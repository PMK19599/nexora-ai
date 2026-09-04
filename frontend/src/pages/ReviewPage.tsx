import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reviewAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
export default function ReviewPage() {
  const qc = useQueryClient();
  const [sel, setSel] = useState<string|null>(null);
  const { data: queue } = useQuery({ queryKey: ['reviewQueue'], queryFn: async () => { const { data } = await reviewAPI.getQueue(); return data.data; } });
  const { data: stats } = useQuery({ queryKey: ['reviewStats'], queryFn: async () => { const { data } = await reviewAPI.getStats(); return data.data; } });
  const { data: pred } = useQuery({ queryKey: ['prediction', sel], queryFn: async () => { if (!sel) return null; const { data } = await reviewAPI.getPrediction(sel); return data.data; }, enabled: !!sel });
  const log = useMutation({ mutationFn: reviewAPI.logAttempt, onSuccess: r => { toast.success(r.data.message); qc.invalidateQueries({ queryKey: ['reviewQueue'] }); qc.invalidateQueries({ queryKey: ['reviewStats'] }); } });
  const due = queue?.due || [], up = queue?.upcoming || [];
  const hasReviewContent = (stats?.totalTopics || 0) > 0 || (stats?.totalReviews || 0) > 0 || up.length > 0;
  const review = (tid: string, q: number) => log.mutate({ topicId: tid, quality: q, responseTime: Math.floor(Math.random()*30000)+5000, correct: q >= 3 });
  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">🧠 Spaced Repetition Review</h1><p className="text-muted-foreground">AI-powered adaptive review with forgetting curves</p></div>
      <Tabs defaultValue="review" className="space-y-4"><TabsList><TabsTrigger value="review">Queue ({due.length})</TabsTrigger><TabsTrigger value="predictions">Predictions</TabsTrigger><TabsTrigger value="stats">Stats</TabsTrigger></TabsList>
        <TabsContent value="review" className="space-y-4">
          {due.length === 0 ? (
            !hasReviewContent ? (
              <Card>
                <CardContent className="flex flex-col items-center py-12 text-center">
                  <span className="text-6xl mb-4">📚</span>
                  <h2 className="text-xl font-semibold">No review items yet</h2>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Play a quiz in Learn & Play to generate flashcards and start your spaced review queue.
                  </p>
                  <Link to="/games">
                    <Button className="bg-gradient-to-r from-teal-600 to-emerald-600 shadow-md">
                      Go to Learn & Play
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center py-12">
                  <span className="text-6xl mb-4">✅</span>
                  <h2 className="text-xl font-semibold">All caught up!</h2>
                  <p className="text-muted-foreground">No reviews due now.</p>
                </CardContent>
              </Card>
            )
          ) :
          <div className="grid gap-4 md:grid-cols-2">{due.map((it:any)=>(<Card key={it._id} className="border-l-4 border-l-teal-500"><CardHeader><div className="flex items-center justify-between"><CardTitle className="text-lg">{it.topicId?.title||'Topic'}</CardTitle><Badge variant={it.mastery>=80?'success':it.mastery>=50?'warning':'destructive'}>{it.mastery}%</Badge></div><CardDescription>Retention: {it.retentionRate}% • Confidence: {it.confidence}%</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><div className="flex justify-between text-sm"><span>Memory Strength</span><span>{it.memoryStrength?.toFixed(1)}</span></div><Progress value={Math.min(100,it.memoryStrength*20)} /></div><div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm"><p className="font-medium text-amber-800">⚠️ Probability of forgetting in 3 days: {Math.round(100-(it.retentionRate||50))}%</p><p className="text-amber-700">Review now to improve retention.</p></div><div className="flex gap-2"><Button size="sm" variant="destructive" onClick={()=>review(it.topicId?._id,1)} disabled={log.isPending}>😟 Hard</Button><Button size="sm" variant="outline" onClick={()=>review(it.topicId?._id,3)} disabled={log.isPending}>🤔 Good</Button><Button size="sm" onClick={()=>review(it.topicId?._id,5)} disabled={log.isPending}>😊 Easy</Button><Button size="sm" variant="ghost" onClick={()=>setSel(it.topicId?._id)}>📊</Button></div></CardContent></Card>))}</div>}
          {up.length>0 && <Card><CardHeader><CardTitle className="text-lg">📅 Upcoming</CardTitle></CardHeader><CardContent><div className="space-y-2">{up.map((it:any)=><div key={it._id} className="flex items-center justify-between rounded-md p-2 hover:bg-accent"><span className="font-medium">{it.topicId?.title}</span><div className="flex items-center gap-2"><Badge variant="outline">{it.mastery}%</Badge><span className="text-sm text-muted-foreground">{new Date(it.nextReviewDate).toLocaleDateString()}</span></div></div>)}</div></CardContent></Card>}
        </TabsContent>
        <TabsContent value="predictions">{pred ? <Card><CardHeader><CardTitle>Prediction: {(pred as any).topicId?.title}</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-4 md:grid-cols-3">{[{v:(pred as any).currentRetention,l:'Current Retention'},{v:(pred as any).mastery,l:'Mastery'},{v:(pred as any).memoryStrength?.toFixed(1),l:'Memory Strength'}].map(x=><div key={x.l} className="text-center p-4 rounded-lg bg-muted"><p className="text-3xl font-bold">{x.v}%</p><p className="text-sm text-muted-foreground">{x.l}</p></div>)}</div><div className="rounded-md bg-blue-50 border border-blue-200 p-4"><p className="font-medium text-blue-800">{(pred as any).recommendation}</p></div><ResponsiveContainer width="100%" height={300}><AreaChart data={(pred as any).predictions}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="days" /><YAxis domain={[0,100]} /><Tooltip /><Area type="monotone" dataKey="retentionProbability" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} name="Retention %" /><Area type="monotone" dataKey="forgetProbability" stroke="#ef4444" fill="#ef4444" fillOpacity={0.1} name="Forget %" /></AreaChart></ResponsiveContainer></CardContent></Card> : <Card><CardContent className="py-12 text-center text-muted-foreground">Select a topic to see predictions</CardContent></Card>}</TabsContent>
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">{[{v:stats?.totalTopics||0,l:'Topics'},{v:stats?.masteredTopics||0,l:'Mastered',c:'text-green-600'},{v:`${stats?.avgRetention||0}%`,l:'Avg Retention'},{v:stats?.totalReviews||0,l:'Reviews'}].map(x=><Card key={x.l}><CardContent className="pt-6 text-center"><p className={`text-3xl font-bold ${x.c||''}`}>{x.v}</p><p className="text-sm text-muted-foreground">{x.l}</p></CardContent></Card>)}</div>
          {(stats?.topicBreakdown||[]).length>0 && <Card><CardHeader><CardTitle>All Topics</CardTitle></CardHeader><CardContent><div className="space-y-3">{stats.topicBreakdown.map((t:any,i:number)=><div key={i} className="space-y-1"><div className="flex justify-between text-sm"><span className="font-medium">{t.topic}</span><span>{t.mastery}%</span></div><Progress value={t.mastery} indicatorClassName={t.mastery>=80?'bg-green-500':t.mastery>=50?'bg-yellow-500':'bg-red-500'} /></div>)}</div></CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
