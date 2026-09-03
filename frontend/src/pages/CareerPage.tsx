import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { careerAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SpeakButton from '@/components/common/SpeakButton';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

export default function CareerPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [dj, setDj] = useState('');
  const [co, setCo] = useState('');
  const [sk, setSk] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [duration, setDuration] = useState('6');

  const { data: paths } = useQuery({ queryKey: ['careerPaths'], queryFn: async () => { const { data } = await careerAPI.getPaths(); return data.data; } });
  const { data: roadmaps } = useQuery({ queryKey: ['roadmaps'], queryFn: async () => { const { data } = await careerAPI.getRoadmaps(); return data.data; } });
  const { data: gap } = useQuery({ queryKey: ['gap', selId], queryFn: async () => { if (!selId) return null; const { data } = await careerAPI.getGapAnalysis(selId); return data.data; }, enabled: !!selId });

  const anM = useMutation({
    mutationFn: (d: any) => careerAPI.analyze(d),
    onSuccess: r => { toast.success('✅ Career analysis complete!'); setSelId(r.data.data._id); qc.invalidateQueries({ queryKey: ['careerPaths'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Analysis failed'),
  });
  const rmM = useMutation({
    mutationFn: (d: any) => careerAPI.generateRoadmap(d),
    onSuccess: () => { toast.success('🗺️ Roadmap generated!'); qc.invalidateQueries({ queryKey: ['roadmaps'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Roadmap generation failed'),
  });
  const shareM = useMutation({
    mutationFn: (roadmapId: string) => careerAPI.shareRoadmap(roadmapId),
    onSuccess: () => { toast.success('Roadmap published to Peer Sharing feed!'); qc.invalidateQueries({ queryKey: ['roadmaps'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed to share roadmap'),
  });
  const handleShare = (id: string) => shareM.mutate(id);
  const deleteM = useMutation({ mutationFn: (id: string) => careerAPI.deletePath(id), onSuccess: () => { toast.success('Career path deleted.'); setSelId(null); qc.invalidateQueries({ queryKey: ['careerPaths'] }); qc.invalidateQueries({ queryKey: ['roadmaps'] }); }, onError: () => toast.error('Could not delete this career path.') });

  const isNeurodivergent = user?.learningTrack === 'neurodivergent' || user?.neurodivergentType !== 'none';

  const handleAnalyze = () => {
    if (!dj || !co) { toast.error('Enter your dream job and company'); return; }
    anM.mutate({ dreamJob: dj, company: co, skills: sk.split(',').map(s => s.trim()).filter(Boolean) });
  };

  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadAbort = useRef<AbortController | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !dj || !co) { toast.error('Enter job & company, then upload PDF'); return; }
    if (f.type !== 'application/pdf' || !f.name.toLowerCase().endsWith('.pdf')) { toast.error('Choose a PDF file.'); e.target.value=''; return; }
    if (f.size > 10 * 1024 * 1024) { toast.error('PDF must be 10 MB or smaller.'); e.target.value=''; return; }
    const fd = new FormData();
    fd.append('syllabus', f); fd.append('dreamJob', dj); fd.append('company', co);
    try {
      setIsUploading(true);
      setUploadProgress(0);
      uploadAbort.current = new AbortController();
      setUploadStep('Uploading and processing PDF…');
      
      const { data } = await careerAPI.uploadSyllabus(fd, { signal: uploadAbort.current.signal, onUploadProgress: p => setUploadProgress(p.total ? Math.round((p.loaded / p.total) * 100) : 0) });
      toast.success('📄 Syllabus analyzed successfully!');
      setSelId(data.data._id);
      qc.invalidateQueries({ queryKey: ['careerPaths'] });
    } catch (error: any) { 
      toast.error(error?.code === 'ERR_CANCELED' ? 'Upload cancelled.' : 'Upload failed. You can retry with the same file.'); 
    } finally {
      uploadAbort.current = null;
      setIsUploading(false);
      setUploadStep('');
    }
  };

  const monthColors = ['bg-teal-500', 'bg-emerald-500', 'bg-cyan-500', 'bg-amber-500', 'bg-orange-500', 'bg-rose-500', 'bg-blue-500', 'bg-green-500'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🚀 <span className="gradient-text">AI Career Roadmap</span></h1>
        <p className="text-muted-foreground">Enter your dream job → Get a personalized step-by-step learning plan</p>
      </div>

      {isNeurodivergent && (
        <Card className="border-0 shadow-md bg-gradient-to-r from-violet-50 to-indigo-50 border-l-4 border-violet-500 animate-fade-in-up">
          <CardContent className="p-4 flex items-center gap-4">
            <span className="text-3xl animate-pulse">🌟</span>
            <div>
              <h4 className="font-bold text-violet-950">Tailored Learning & Project Mode Active</h4>
              <p className="text-xs text-violet-700 mt-1 leading-relaxed">
                Your career roadmaps prioritize project- and portfolio-based milestones, structured pacing, and practical alternatives to standard abstract interview formats.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="analyze" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analyze">🔍 Analyze Career</TabsTrigger>
          <TabsTrigger value="gap">📊 Gap Analysis</TabsTrigger>
          <TabsTrigger value="roadmap">🗺️ Roadmap ({roadmaps?.length || 0})</TabsTrigger>
        </TabsList>

        {/* ===== ANALYZE ===== */}
        <TabsContent value="analyze" className="space-y-6">
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">What's your dream role?</CardTitle>
              <CardDescription>Identify key skills, core technologies, and recommended preparation for your target role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-semibold">Dream Job Title</Label>
                  <Input placeholder="e.g. Software Engineer, Data Scientist, ML Engineer" value={dj} onChange={e => setDj(e.target.value)} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Target Company</Label>
                  <Input placeholder="e.g. Google, Microsoft, OpenAI, Meta" value={co} onChange={e => setCo(e.target.value)} className="h-12" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Your Current Skills (comma-separated)</Label>
                <Input placeholder="e.g. JavaScript, React, Python, SQL — leave empty if beginner" value={sk} onChange={e => setSk(e.target.value)} className="h-12" />
                <p className="text-xs text-muted-foreground">💡 List your current skills to help estimate which areas to focus on first</p>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Upload Syllabus / Course Outline (optional)</Label>
                <Input type="file" accept=".pdf" onChange={handleUpload} disabled={isUploading || anM.isPending} />
                <p className="text-xs text-muted-foreground">PDF only, maximum 10 MB. Your file is private to your account and can be removed with its generated career record.</p>
                {isUploading && (
                  <div className="mt-4 p-4 rounded-xl bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                      <p className="text-sm font-semibold text-blue-800">{uploadStep} {uploadProgress ? `(${uploadProgress}%)` : ''}</p>
                      <Button type="button" size="sm" variant="outline" onClick={() => uploadAbort.current?.abort()}>Cancel upload</Button>
                    </div>
                  </div>
                )}
              </div>
              <Button onClick={handleAnalyze} disabled={anM.isPending || isUploading} className="gradient-btn text-white h-12 px-8 text-base">
                {anM.isPending ? '🔄 Analyzing with AI...' : '🔍 Analyze My Career Path'}
              </Button>
            </CardContent>
          </Card>

          {/* Career Path cards */}
          {(paths || []).length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Your Career Paths</h2>
              {paths.map((p: any) => (
                <Card key={p._id} className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg ${selId === p._id ? 'ring-2 ring-primary' : ''}`} onClick={() => setSelId(p._id)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-bold">{p.dreamJob}</h3>
                        <p className="text-sm text-muted-foreground">at {p.company}</p>
                      </div>
                      <div className="flex gap-2"><SpeakButton text={`${p.dreamJob} at ${p.company}. Required skills: ${p.requiredSkills?.join(', ')}`} /><Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); if (window.confirm('Delete this career path and its uploaded syllabus?')) deleteM.mutate(p._id); }}>Delete</Button></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {p.requiredSkills?.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    </div>
                    {p.techStack?.length > 0 && (
                      <div className="mb-4">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">Tech Stack:</p>
                        <div className="flex flex-wrap gap-1">{p.techStack.map((t: string) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}</div>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="3">3 Months</SelectItem>
                          <SelectItem value="6">6 Months</SelectItem>
                          <SelectItem value="9">9 Months</SelectItem>
                          <SelectItem value="12">12 Months</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button size="sm" onClick={e => { e.stopPropagation(); rmM.mutate({ careerPathId: p._id, duration: parseInt(duration) }); }}
                        disabled={rmM.isPending} className="gradient-btn text-white">
                        {rmM.isPending ? '🔄...' : '🗺️ Generate Roadmap'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ===== GAP ANALYSIS ===== */}
        <TabsContent value="gap" className="space-y-4">
          {gap ? (
            <Card className="border-0 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>📊 Skill Gap Analysis</CardTitle>
                    <CardDescription>Your readiness for the target role</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-extrabold gradient-text">{(gap as any).overallMatch}%</p>
                    <p className="text-xs text-muted-foreground">Overall Match</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <Progress value={(gap as any).overallMatch} className="h-4" indicatorClassName={(gap as any).overallMatch >= 70 ? 'bg-green-500' : (gap as any).overallMatch >= 40 ? 'bg-amber-500' : 'bg-red-500'} />

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h3 className="font-bold text-green-700 mb-3 flex items-center gap-2">✅ Skills You Have ({(gap as any).matchedSkills?.length || 0})</h3>
                    <div className="flex flex-wrap gap-2">
                      {(gap as any).matchedSkills?.length > 0
                        ? (gap as any).matchedSkills.map((s: string) => <Badge key={s} variant="success" className="py-1">{s}</Badge>)
                        : <p className="text-sm text-muted-foreground">No matching skills yet — that's okay! Everyone starts somewhere.</p>}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-red-700 mb-3 flex items-center gap-2">❌ Skills to Learn ({(gap as any).missingSkills?.length || 0})</h3>
                    <div className="space-y-2">
                      {(gap as any).missingSkills?.map((s: any) => (
                        <div key={s.skill} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                          <span className="font-medium text-sm">{s.skill}</span>
                          <div className="flex gap-1.5">
                            <Badge variant={s.priority === 'high' ? 'destructive' : s.priority === 'medium' ? 'warning' : 'outline'} className="text-xs">{s.priority}</Badge>
                            <Badge variant="outline" className="text-xs">⏱ {s.timeEstimate}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <span className="text-5xl block mb-3">📊</span>
                <h3 className="text-lg font-bold mb-2">No gap analysis yet</h3>
                <p className="text-muted-foreground">Go to "Analyze Career" tab, enter your dream job, and click Analyze first.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== ROADMAPS ===== */}
        <TabsContent value="roadmap" className="space-y-6">
          {(roadmaps || []).length === 0 ? (
            <Card className="border-2 border-dashed">
              <CardContent className="py-16 text-center">
                <span className="text-5xl block mb-3">🗺️</span>
                <h3 className="text-lg font-bold mb-2">No roadmaps yet</h3>
                <p className="text-muted-foreground">Analyze a career path first, then click "Generate Roadmap".</p>
              </CardContent>
            </Card>
          ) : (
            roadmaps.map((rm: any) => (
              <Card key={rm._id} className="border-0 shadow-lg overflow-hidden">
                <div className="p-6 gradient-btn text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{rm.duration}-Month Career Roadmap</h2>
                      <p className="text-teal-100 text-sm mt-1">A structured step-by-step roadmap for your target role</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <SpeakButton text={`Your ${rm.duration} month career roadmap. ${rm.months?.map((m: any) => `Month ${m.month}: ${m.title}. Goals: ${m.goals?.join(', ')}`).join('. ')}`} />
                      <Button
                        size="sm"
                        variant="secondary"
                        className={`text-xs font-semibold ${rm.isPublic ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100' : 'bg-white/20 text-white hover:bg-white/30 border-0'}`}
                        onClick={() => handleShare(rm._id)}
                        disabled={rm.isPublic}
                      >
                        {rm.isPublic ? '✓ Shared with Peers' : '🌐 Share with Peers'}
                      </Button>
                    </div>
                  </div>
                </div>
                <CardContent className="p-6">
                  {/* Timeline */}
                  <div className="relative">
                    {rm.months?.map((m: any, i: number) => (
                      <div key={m.month} className="relative pl-10 pb-8 last:pb-0">
                        {/* Timeline line */}
                        {i < rm.months.length - 1 && <div className="absolute left-[18px] top-10 bottom-0 w-0.5 bg-muted" />}
                        {/* Timeline dot */}
                        <div className={`absolute left-2 top-1 w-7 h-7 rounded-full ${monthColors[i % monthColors.length]} flex items-center justify-center text-white text-xs font-bold shadow-md`}>
                          {m.month}
                        </div>

                        <div className="rounded-xl border p-5 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-lg">Month {m.month}: {m.title}</h3>
                            <SpeakButton text={`Month ${m.month}: ${m.title}. Goals: ${m.goals?.join('. ')}. Projects: ${m.projects?.join('. ')}`} />
                          </div>

                          <div className="grid gap-4 md:grid-cols-2">
                            {/* Goals */}
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">🎯 Goals</p>
                              <ul className="space-y-1.5">
                                {m.goals?.map((g: string, j: number) => (
                                  <li key={j} className="text-sm flex items-start gap-2">
                                    <span className="text-teal-500 mt-0.5">▸</span>
                                    <span>{g}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Skills */}
                            <div>
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">🛠️ Skills</p>
                              <div className="flex flex-wrap gap-1.5">
                                {m.skills?.map((s: string) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                              </div>
                            </div>
                          </div>

                          {/* Projects */}
                          {m.projects?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">💻 Projects</p>
                              <div className="grid gap-2 md:grid-cols-2">
                                {m.projects.map((p: string, j: number) => (
                                  <div key={j} className="text-sm p-2.5 rounded-lg bg-muted/50 flex items-start gap-2">
                                    <span className="text-amber-500">◆</span>
                                    <span>{p}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Resources */}
                          {m.resources?.length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">📚 Resources</p>
                              <div className="flex flex-wrap gap-1.5">
                                {m.resources.map((r: string, j: number) => (
                                  <span key={j} className="text-xs px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">{r}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Milestones */}
                          {m.milestones?.length > 0 && (
                            <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                              <p className="text-xs font-bold text-amber-700 mb-1">🏁 Milestones</p>
                              <div className="flex flex-wrap gap-2">
                                {m.milestones.map((ml: string, j: number) => (
                                  <span key={j} className="text-xs text-amber-800">✓ {ml}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Interview Questions */}
                  {rm.interviewQuestions?.length > 0 && (
                    <div className="mt-8 p-6 rounded-xl bg-muted/30 border">
                      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        🎤 Interview Questions to Prepare
                        <SpeakButton text={rm.interviewQuestions.join('. ')} />
                      </h3>
                      <div className="grid gap-2 md:grid-cols-2">
                        {rm.interviewQuestions.map((q: string, i: number) => (
                          <div key={i} className="text-sm p-3 rounded-lg bg-white border flex items-start gap-2">
                            <span className="font-bold text-teal-600 shrink-0">Q{i + 1}.</span>
                            <span>{q}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
