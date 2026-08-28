import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/tutorService';
import { PeerTutor, PeerSession, User } from '../models';
import { Types } from 'mongoose';

// Auto-seed sample tutors if none exist
const ensureSampleTutors = async (currentUserId: string) => {
  const count = await PeerTutor.countDocuments();
  if (count > 0) return;

  // Create sample tutor users + profiles
  const tutorData = [
    { name: 'Emma Wilson', email: `tutor_emma_${Date.now()}@nexora.ai`, password: 'tutor123456', skills: ['React', 'Node.js', 'TypeScript', 'MongoDB'], subjects: ['React', 'Node.js', 'TypeScript', 'MongoDB'], bio: 'Full-stack developer with 3 years experience. I love helping others learn web development!', rating: 4.7 },
    { name: 'James Chen', email: `tutor_james_${Date.now()}@nexora.ai`, password: 'tutor123456', skills: ['Python', 'Machine Learning', 'Data Science', 'TensorFlow'], subjects: ['Python', 'Machine Learning', 'Data Science', 'TensorFlow'], bio: 'ML engineer passionate about making AI accessible to everyone.', rating: 4.5 },
    { name: 'Sarah Park', email: `tutor_sarah_${Date.now()}@nexora.ai`, password: 'tutor123456', skills: ['Algorithms', 'Data Structures', 'System Design', 'Java'], subjects: ['Algorithms', 'Data Structures', 'System Design', 'Java'], bio: 'Ex-Google engineer. Specialized in interview prep and system design.', rating: 4.9 },
    { name: 'Raj Patel', email: `tutor_raj_${Date.now()}@nexora.ai`, password: 'tutor123456', skills: ['Cloud Computing', 'AWS', 'Docker', 'Kubernetes'], subjects: ['AWS', 'Docker', 'Kubernetes', 'DevOps'], bio: 'Cloud architect helping students master DevOps and cloud infrastructure.', rating: 4.3 },
    { name: 'Lisa Nguyen', email: `tutor_lisa_${Date.now()}@nexora.ai`, password: 'tutor123456', skills: ['Mathematics', 'Statistics', 'Calculus', 'Linear Algebra'], subjects: ['Calculus', 'Statistics', 'Linear Algebra', 'Probability'], bio: 'Math PhD student. Making complex math concepts simple and fun!', rating: 4.6 },
  ];

  for (const td of tutorData) {
    try {
      const user = await User.create({ name: td.name, email: td.email, password: td.password, role: 'tutor', skills: td.skills, learningTrack: 'normal', neurodivergentType: 'none' });
      await PeerTutor.create({
        userId: user._id, subjects: td.subjects, rating: td.rating, totalSessions: Math.floor(Math.random() * 20) + 5,
        totalRatings: Math.floor(Math.random() * 15) + 3, bio: td.bio, isActive: true,
        availability: [
          { day: 'monday', startTime: '09:00', endTime: '17:00' },
          { day: 'wednesday', startTime: '09:00', endTime: '17:00' },
          { day: 'friday', startTime: '10:00', endTime: '15:00' },
        ],
      });
    } catch {} // Skip if already exists
  }
};

export const getTutors = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await ensureSampleTutors(req.user!._id.toString());

    if (req.query.subject) {
      const tutors = await svc.findMatchingTutors(req.user!._id.toString(), req.query.subject as string);
      res.json({ success: true, data: tutors });
    } else {
      const tutors = await PeerTutor.find({ isActive: true })
        .populate('userId', 'name email avatar learningTrack neurodivergentType timezone')
        .sort({ rating: -1 });
      res.json({ success: true, data: tutors });
    }
  } catch (e) { next(e); }
};

export const registerAsTutor = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const existing = await PeerTutor.findOne({ userId: req.user!._id });
    if (existing) {
      const u = await PeerTutor.findOneAndUpdate({ userId: req.user!._id }, { ...req.body, isActive: true }, { new: true });
      res.json({ success: true, data: u }); return;
    }
    res.status(201).json({ success: true, data: await PeerTutor.create({ userId: req.user!._id, ...req.body }) });
  } catch (e) { next(e); }
};

export const requestSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { tutorId, subject, scheduledAt, duration } = req.body;
    if (!tutorId || typeof tutorId !== 'string') { res.status(400).json({ success: false, message: 'tutorId is required and must be a string' }); return; }
    if (!subject || typeof subject !== 'string') { res.status(400).json({ success: false, message: 'subject is required and must be a string' }); return; }
    if (!scheduledAt || typeof scheduledAt !== 'string') { res.status(400).json({ success: false, message: 'scheduledAt is required and must be a string' }); return; }
    if (!duration || typeof duration !== 'number') { res.status(400).json({ success: false, message: 'duration is required and must be a number' }); return; }
    res.status(201).json({ success: true, data: await svc.requestSession(req.user!._id.toString(), tutorId, subject, scheduledAt, duration) });
  } catch (e) { next(e); }
};

export const acceptSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: await svc.acceptSession(req.body.sessionId, req.user!._id.toString()) });
  } catch (e) { next(e); }
};

export const rateSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: await svc.rateSession(req.body.sessionId, req.user!._id.toString(), req.body.rating, req.body.feedback) });
  } catch (e) { next(e); }
};

export const getSchedule = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: await svc.getTutorSchedule(req.user!._id.toString()) });
  } catch (e) { next(e); }
};

export const getMySessions = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.json({ success: true, data: await PeerSession.find({ $or: [{ tutorId: req.user!._id }, { studentId: req.user!._id }] }).populate('tutorId', 'name email avatar').populate('studentId', 'name email avatar').sort({ scheduledAt: -1 }) });
  } catch (e) { next(e); }
};
