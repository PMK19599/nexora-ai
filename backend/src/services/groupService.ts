import { StudyGroup, GroupMeeting, User, Notification } from '../models';
import { Types } from 'mongoose';

export const calculateCompatibility = (u1: any, u2: any): number => {
  let s = 0;
  s += Math.min(30, (u1.interests?.filter((i: string) => u2.interests?.includes(i)).length || 0) * 10);
  s += Math.min(30, ((u1.skills?.filter((x: string) => !u2.skills?.includes(x)).length || 0) + (u2.skills?.filter((x: string) => !u1.skills?.includes(x)).length || 0)) * 5);
  s += u1.timezone === u2.timezone ? 20 : 5;
  s += u1.learningTrack === u2.learningTrack ? 10 : 0;
  s += u1.neurodivergentType === u2.neurodivergentType ? 10 : 0;
  return Math.min(100, s);
};

export const toNeutralPreference = (type?: string): string | null => {
  if (!type) return null;
  const normalized = type.toLowerCase().trim();
  switch (normalized) {
    case 'focus':
    case 'adhd':
      return 'Focus-Friendly';
    case 'predictable':
    case 'autism':
      return 'Predictable Layout';
    case 'reading':
    case 'dyslexia':
      return 'Reading-Friendly';
    default:
      return null;
  }
};

export const matchStudyGroups = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Not found');
  const candidates = await User.find({ _id: { $ne: new Types.ObjectId(userId) }, role: 'student' }).limit(50);
  const suggestedUsers = candidates
    .filter(c => c._id.toString() !== userId.toString())
    .map(c => ({
      id: c._id,
      name: c.name,
      skills: c.skills,
      interests: c.interests,
      learningTrack: c.learningTrack,
      learningPreference: toNeutralPreference(c.neurodivergentType),
      compatibilityScore: calculateCompatibility(user, c)
    }))
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 10);
  const availableGroups = await StudyGroup.find({ isActive: true, 'members.userId': { $ne: new Types.ObjectId(userId) }, $expr: { $lt: [{ $size: '$members' }, '$maxMembers'] } }).populate('members.userId', 'name email avatar');
  return { suggestedUsers, availableGroups };
};

export const createGroup = async (userId: string, data: any) => {
  const user = await User.findById(userId);
  if (!user) throw new Error('Not found');
  const af: string[] = [];
  if (data.neurodivergentFriendly || user.learningTrack === 'neurodivergent') {
    if (user.neurodivergentType === 'adhd') af.push('accountability_tracking','short_goals','pomodoro');
    if (user.neurodivergentType === 'autism') af.push('predictable_schedule','structured_agenda','fixed_meetings');
    if (user.neurodivergentType === 'dyslexia') af.push('audio_notes','tts_support','accessible_docs');
  }
  return StudyGroup.create({ ...data, createdBy: new Types.ObjectId(userId), members: [{ userId: new Types.ObjectId(userId), role: 'member', joinedAt: new Date() }], timezone: user.timezone, accessibilityFeatures: af, neurodivergentFriendly: data.neurodivergentFriendly || user.learningTrack === 'neurodivergent' });
};

export const joinGroup = async (userId: string, groupId: string) => {
  const g = await StudyGroup.findById(groupId);
  if (!g) throw new Error('Group not found');
  if (g.members.length >= g.maxMembers) throw new Error('Group is full');
  if (g.members.some(m => m.userId.toString() === userId)) throw new Error('Already a member');
  const roles = ['timekeeper','notetaker','questionmaster','presenter'] as const;
  const taken = g.members.map(m => m.role);
  const role = roles.find(r => !taken.includes(r)) || 'member';
  g.members.push({ userId: new Types.ObjectId(userId), role, joinedAt: new Date() });
  await g.save();
  for (const m of g.members) { if (m.userId.toString() !== userId) await Notification.create({ userId: m.userId, type: 'group', title: 'New Member', message: 'A new member joined your group.', data: { groupId: g._id } }); }
  return g;
};

export const getUserGroups = async (userId: string) =>
  StudyGroup.find({ 'members.userId': new Types.ObjectId(userId), isActive: true }).populate('members.userId', 'name email avatar learningTrack neurodivergentType');

export const scheduleMeeting = async (groupId: string, userId: string, data: any) => {
  const g = await StudyGroup.findById(groupId);
  if (!g) throw new Error('Not found');
  if (!g.members.some(m => m.userId.toString() === userId)) throw new Error('Not a member');
  const meeting = await GroupMeeting.create({ groupId: new Types.ObjectId(groupId), title: data.title, agenda: data.agenda, scheduledAt: new Date(data.scheduledAt), duration: data.duration || 60, attendees: g.members.map(m => m.userId) });
  for (const m of g.members) await Notification.create({ userId: m.userId, type: 'group', title: 'Meeting Scheduled', message: `"${data.title}" scheduled.`, data: { meetingId: meeting._id, groupId } });
  return meeting;
};
