import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tutorAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import toast from 'react-hot-toast';
export default function TutorPage() {
  const { user } = useAuthStore(); const qc = useQueryClient();
  const [search, setSearch] = useState(''); const [showReq, setShowReq] = useState(false); const [selTutor, setSelTutor] = useState<any>(null);
  const [sDate, setSDate] = useState(''); const [sSubj, setSSubj] = useState('');
  const [showRate, setShowRate] = useState(false); const [rateSess, setRateSess] = useState<any>(null); const [rating, setRating] = useState(5); const [fb, setFb] = useState('');
  const { data: tutors, isLoading } = useQuery({ queryKey: ['tutors', search], queryFn: async () => { const { data } = await tutorAPI.getTutors(search||undefined); return data.data; } });
  const { data: sessions } = useQuery({ queryKey: ['mySessions'], queryFn: async () => { const { data } = await tutorAPI.getSessions(); return data.data; } });
  const reqM = useMutation({ mutationFn: tutorAPI.requestSession, onSuccess: () => { toast.success('Request sent!'); setShowReq(false); qc.invalidateQueries({ queryKey: ['mySessions'] }); } });
  const accM = useMutation({ mutationFn: (id: string) => tutorAPI.acceptSession(id), onSuccess: () => { toast.success('Accepted!'); qc.invalidateQueries({ queryKey: ['mySessions'] }); } });
  const rateM = useMutation({ mutationFn: tutorAPI.rateSession, onSuccess: () => { toast.success('Rated!'); setShowRate(false); qc.invalidateQueries({ queryKey: ['mySessions'] }); } });
  const [regSubjs, setRegSubjs] = useState(''); const [regBio, setRegBio] = useState('');
  const regM = useMutation({ mutationFn: tutorAPI.registerAsTutor, onSuccess: () => { toast.success('Registered as tutor!'); qc.invalidateQueries({ queryKey: ['tutors'] }); } });
  return (
    <div className="space-y-6"><div><h1 className="text-3xl font-bold">👥 Peer Teaching Network</h1><p className="text-muted-foreground">Find tutors, book sessions, earn XP</p></div>
      <Tabs defaultValue="find" className="space-y-4"><TabsList><TabsTrigger value="find">Find Tutors</TabsTrigger><TabsTrigger value="sessions">Sessions ({sessions?.length||0})</TabsTrigger><TabsTrigger value="become">Become Tutor</TabsTrigger></TabsList>
        <TabsContent value="find" className="space-y-4">
          <div className="flex gap-2"><Input placeholder="Search by subject" value={search} onChange={e=>setSearch(e.target.value)} className="max-w-md" /><Button onClick={()=>qc.invalidateQueries({queryKey:['tutors']})}>🔍</Button></div>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : (tutors || []).length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground space-y-2">
                <p className="font-semibold text-lg">No peer tutors available yet.</p>
                <p className="text-sm">Be the first to offer peer tutoring, or check back soon.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(tutors || []).map((t: any) => (
                <Card key={t.id || t._id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">{t.userId?.name?.charAt(0) || 'T'}</div>
                      <div>
                        <CardTitle className="text-lg">{t.userId?.name || 'Tutor'}</CardTitle>
                        <CardDescription>⭐ {t.rating?.toFixed(1) || '0.0'} • {t.totalSessions || 0} sessions</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-1">{t.subjects?.map((s: string) => <Badge key={s} variant="secondary">{s}</Badge>)}</div>
                    {t.bio && <p className="text-sm text-muted-foreground">{t.bio}</p>}
                    {t.matchScore !== undefined && <Badge variant={t.matchScore >= 70 ? 'success' : 'outline'}>Match: {t.matchScore}%</Badge>}
                    <Button size="sm" className="w-full" onClick={() => { setSelTutor(t); setSSubj(t.subjects?.[0] || ''); setShowReq(true); }}>📅 Request</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        <TabsContent value="sessions" className="space-y-4">{(sessions||[]).length===0?<Card><CardContent className="py-12 text-center text-muted-foreground">No sessions yet</CardContent></Card>:sessions.map((s:any)=><Card key={s._id}><CardContent className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-6"><div><p className="font-semibold">{s.subject}</p><p className="text-sm text-muted-foreground">With: {s.tutorId?.name||s.studentId?.name} • {new Date(s.scheduledAt).toLocaleString()}</p></div><div className="flex items-center gap-2"><Badge variant={s.status==='completed'?'success':s.status==='accepted'?'default':s.status==='pending'?'warning':'outline'}>{s.status}</Badge>{s.status==='pending'&&s.tutorId?._id===user?._id&&<Button size="sm" onClick={()=>accM.mutate(s._id)}>✅ Accept</Button>}{s.status==='accepted'&&s.studentId?._id===user?._id&&<Button size="sm" variant="outline" onClick={()=>{setRateSess(s);setShowRate(true)}}>⭐ Rate</Button>}</div></CardContent></Card>)}</TabsContent>
        <TabsContent value="become"><Card><CardHeader><CardTitle>Become a Tutor</CardTitle><CardDescription>Share knowledge, earn XP</CardDescription></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Subjects (comma-separated)</Label><Input value={regSubjs} onChange={e=>setRegSubjs(e.target.value)} placeholder="e.g. React, Python" /></div><div className="space-y-2"><Label>Bio</Label><Textarea value={regBio} onChange={e=>setRegBio(e.target.value)} /></div><Button onClick={()=>regM.mutate({subjects:regSubjs.split(',').map(s=>s.trim()).filter(Boolean),bio:regBio})} disabled={regM.isPending}>🎓 Register</Button></CardContent></Card></TabsContent>
      </Tabs>
      <Dialog open={showReq} onOpenChange={setShowReq}><DialogContent><DialogHeader><DialogTitle>Request Session</DialogTitle><DialogDescription>Book with {selTutor?.userId?.name}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Subject</Label><Input value={sSubj} onChange={e=>setSSubj(e.target.value)} /></div><div className="space-y-2"><Label>Date & Time</Label><Input type="datetime-local" value={sDate} onChange={e=>setSDate(e.target.value)} /></div>{user?.neurodivergentType==='focus'&&<p className="text-sm text-blue-600 bg-blue-50 p-2 rounded">ℹ️ Focus-Friendly: 15min session for focus</p>}</div><DialogFooter><Button variant="outline" onClick={()=>setShowReq(false)}>Cancel</Button><Button onClick={()=>reqM.mutate({tutorId:selTutor?.id||selTutor?._id,subject:sSubj,scheduledAt:sDate,duration:user?.neurodivergentType==='focus'?15:30})} disabled={reqM.isPending}>Send</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={showRate} onOpenChange={setShowRate}><DialogContent><DialogHeader><DialogTitle>Rate Session</DialogTitle></DialogHeader><div className="space-y-4"><div className="flex gap-2 justify-center">{[1,2,3,4,5].map(n=><button key={n} onClick={()=>setRating(n)} className={`text-3xl ${n<=rating?'scale-110':'opacity-30'}`}>⭐</button>)}</div><Textarea placeholder="Feedback..." value={fb} onChange={e=>setFb(e.target.value)} /></div><DialogFooter><Button onClick={()=>rateM.mutate({sessionId:rateSess?._id,rating,feedback:fb})}>Submit</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
