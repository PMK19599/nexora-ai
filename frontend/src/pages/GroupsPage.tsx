import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupAPI, careerAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import GroupChat from '@/components/groups/GroupChat';
import { getPreferenceLabel } from '@/utils/helpers';
const RI:Record<string,string> = {timekeeper:'⏱️',notetaker:'📝',questionmaster:'❓',presenter:'🎤',member:'👤'};
export default function GroupsPage() {
  const { user } = useAuthStore(); const qc = useQueryClient();
  const [show, setShow] = useState(false); const [nm, setNm] = useState(''); const [desc, setDesc] = useState(''); const [goals, setGoals] = useState(''); const [skills, setSkills] = useState(''); const [ndf, setNdf] = useState(user?.learningTrack === 'neurodivergent');
  const { data: my } = useQuery({ queryKey: ['myGroups'], queryFn: async () => { const { data } = await groupAPI.getGroups(); return data.data; } });
  const { data: matches } = useQuery({ queryKey: ['groupMatches'], queryFn: async () => { const { data } = await groupAPI.match(); return data.data; } });
  const { data: sharedRoadmaps } = useQuery({ queryKey: ['sharedRoadmaps'], queryFn: async () => { const { data } = await careerAPI.getSharedRoadmaps(); return data.data; } });
  const crM = useMutation({ mutationFn: groupAPI.create, onSuccess: () => { toast.success('Created!'); setShow(false); qc.invalidateQueries({ queryKey: ['myGroups'] }); } });
  const jnM = useMutation({ mutationFn: groupAPI.join, onSuccess: () => { toast.success('Joined!'); qc.invalidateQueries({ queryKey: ['myGroups'] }); qc.invalidateQueries({ queryKey: ['groupMatches'] }); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Failed') });
  const importM = useMutation({ mutationFn: careerAPI.importRoadmap, onSuccess: () => { toast.success('Curriculum imported successfully! You can view it in your Roadmaps.'); qc.invalidateQueries({ queryKey: ['sharedRoadmaps'] }); }, onError: (e: any) => toast.error(e.response?.data?.message || 'Import failed') });

  const currentUserId = user?._id || (user as any)?.id;
  const suggestedUsers = (matches?.suggestedUsers || []).filter((u: any) => {
    if (!currentUserId) return true;
    return u.id?.toString() !== currentUserId.toString() && u._id?.toString() !== currentUserId.toString();
  });

  return (
    <div className="space-y-6"><div className="flex items-center justify-between"><div><h1 className="text-3xl font-bold">📚 AI Study Groups</h1><p className="text-muted-foreground">Smart matching by skills, goals & accessibility</p></div><Button onClick={()=>setShow(true)}>+ Create Group</Button></div>
      <Tabs defaultValue="my" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my">My Groups ({my?.length||0})</TabsTrigger>
          <TabsTrigger value="discover">Discover</TabsTrigger>
          <TabsTrigger value="matches">AI Matches</TabsTrigger>
          <TabsTrigger value="peer-sharing">🌟 Peer Curriculums</TabsTrigger>
        </TabsList>
        <TabsContent value="my" className="space-y-4">
          {(my||[]).length===0?<Card><CardContent className="py-12 text-center text-muted-foreground">No groups yet. Create or join one!</CardContent></Card>:my.map((g:any)=><GroupCard key={g._id} g={g} />)}
        </TabsContent>
        <TabsContent value="discover" className="space-y-4">{(matches?.availableGroups||[]).length===0?<Card><CardContent className="py-12 text-center text-muted-foreground">No groups available. Create your own!</CardContent></Card>:matches.availableGroups.map((g:any)=><Card key={g._id}><CardContent className="flex items-center justify-between pt-6"><div><h3 className="font-semibold">{g.name}</h3><p className="text-sm text-muted-foreground">{g.members?.length}/{g.maxMembers} members</p><div className="flex flex-wrap gap-1 mt-1">{g.skills?.map((s:string)=><Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}</div></div><Button size="sm" onClick={()=>jnM.mutate(g._id)} disabled={jnM.isPending}>Join</Button></CardContent></Card>)}</TabsContent>
        <TabsContent value="matches" className="space-y-4">
          <h3 className="text-lg font-semibold">Suggested Partners</h3>
          {suggestedUsers.length === 0 ? (
            <p className="text-muted-foreground">No matches</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {suggestedUsers.map((u: any) => {
                const prefLabel = getPreferenceLabel(u.neurodivergentType);
                return (
                  <Card key={u.id || u._id}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{u.name}</span>
                        <Badge variant={u.compatibilityScore >= 70 ? 'success' : 'outline'}>
                          {u.compatibilityScore}% match
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {u.skills?.map((s: string) => (
                          <Badge key={s} variant="secondary" className="text-xs">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      {prefLabel && (
                        <Badge variant="outline">{prefLabel}</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        <TabsContent value="peer-sharing" className="space-y-4 animate-fade-in-up">
          <div className="flex flex-col gap-1 mb-4">
            <h3 className="text-lg font-bold">🌟 Shared Peer Roadmaps & Curriculums</h3>
            <p className="text-sm text-muted-foreground">Study plans imported from students with similar profiles ({getPreferenceLabel(user?.neurodivergentType) || 'Learning Preferences'})</p>
          </div>
          {(!sharedRoadmaps || sharedRoadmaps.length === 0) ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No shared curriculums found for your neurodivergent type yet. Be the first to share one!
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sharedRoadmaps.map((rm: any) => {
                const authorPref = getPreferenceLabel(rm.userId?.neurodivergentType || user?.neurodivergentType);
                return (
                  <Card key={rm._id} className="border-0 shadow-md hover:shadow-xl transition-all stat-card bg-gradient-to-br from-violet-50/50 to-indigo-50/50">
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-base text-violet-950">{rm.duration}-Month Study Path</h4>
                          <p className="text-xs text-violet-600 font-semibold mt-0.5">Created by: {rm.userId?.name || 'Peer'}</p>
                        </div>
                        {authorPref && (
                          <Badge variant="secondary" className="bg-violet-100 text-violet-700">
                            {authorPref}
                          </Badge>
                        )}
                      </div>

                    <div className="space-y-1 bg-white/60 p-3 rounded-lg border border-violet-100 text-xs">
                      <p className="font-bold text-violet-900">Path Outline:</p>
                      <ul className="list-disc list-inside space-y-1 text-slate-700">
                        {rm.months?.slice(0, 3).map((m: any) => (
                          <li key={m.month} className="truncate">Month {m.month}: {m.title}</li>
                        ))}
                        {rm.months?.length > 3 && <li className="text-slate-400 italic">+{rm.months.length - 3} more months...</li>}
                      </ul>
                    </div>

                    <Button 
                      size="sm" 
                      className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold"
                      onClick={() => importM.mutate(rm._id)}
                      disabled={importM.isPending}
                    >
                      {importM.isPending ? 'Importing...' : '📥 Import Study Plan'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          )}
        </TabsContent>
      </Tabs>
      <Dialog open={show} onOpenChange={setShow}><DialogContent><DialogHeader><DialogTitle>Create Study Group</DialogTitle></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Name</Label><Input value={nm} onChange={e=>setNm(e.target.value)} /></div><div className="space-y-2"><Label>Description</Label><Textarea value={desc} onChange={e=>setDesc(e.target.value)} /></div><div className="space-y-2"><Label>Goals (comma-separated)</Label><Input value={goals} onChange={e=>setGoals(e.target.value)} /></div><div className="space-y-2"><Label>Skills (comma-separated)</Label><Input value={skills} onChange={e=>setSkills(e.target.value)} /></div><div className="flex items-center gap-2"><Switch checked={ndf} onCheckedChange={setNdf} id="ndf" /><Label htmlFor="ndf">♿ Neurodivergent Friendly</Label></div></div><DialogFooter><Button variant="outline" onClick={()=>setShow(false)}>Cancel</Button><Button onClick={()=>crM.mutate({name:nm,description:desc,goals:goals.split(',').map(g=>g.trim()).filter(Boolean),skills:skills.split(',').map(s=>s.trim()).filter(Boolean),neurodivergentFriendly:ndf})} disabled={!nm||crM.isPending}>Create</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function GroupCard({ g }: { g: any }) {
  const [showChat, setShowChat] = useState(false);
  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {g.name}
              {g.neurodivergentFriendly && <Badge variant="secondary">♿</Badge>}
            </CardTitle>
            <CardDescription>{g.description || 'No description'}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge>{g.members?.length || 0}/{g.maxMembers}</Badge>
            <Button variant="outline" size="sm" onClick={() => setShowChat(!showChat)}>
              {showChat ? 'Close Chat' : 'Open Chat 💬'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!showChat && (
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1">{g.goals?.map((x: string) => <Badge key={x} variant="outline">{x}</Badge>)}</div>
          {g.accessibilityFeatures?.length > 0 && <div className="flex flex-wrap gap-1">{g.accessibilityFeatures.map((f: string) => <Badge key={f} variant="secondary" className="text-xs">{f.replace(/_/g, ' ')}</Badge>)}</div>}
          <div className="flex flex-wrap gap-2">{g.members?.map((m: any) => <div key={m.userId?._id || m.userId} className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-sm"><span>{RI[m.role] || '👤'}</span><span>{m.userId?.name || 'Member'}</span><Badge variant="outline" className="text-xs ml-1">{m.role}</Badge></div>)}</div>
        </CardContent>
      )}

      {showChat && (
        <div className="border-t">
          <GroupChat groupId={g._id} />
        </div>
      )}
    </Card>
  );
}
