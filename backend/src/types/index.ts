import { Request } from 'express';
import { Document, Types } from 'mongoose';

export type UserRole = 'student' | 'tutor' | 'admin';
export type LearningTrack = 'normal' | 'neurodivergent';
export type NeurodivergentType = 'adhd' | 'autism' | 'dyslexia' | 'none';

export interface AccessibilitySettings {
  fontSize: 'small' | 'medium' | 'normal' | 'large' | 'xlarge';
  colorContrast: 'normal' | 'high' | 'dark' | 'light' | 'cyberpunk' | 'cosmic';
  animations: boolean;
  readingMode: boolean;
  audioMode: boolean;
  focusMode: boolean;
  fontFamily: 'default' | 'opendyslexic' | 'arial' | 'verdana' | 'vazirmatn';
  lineSpacing: 'normal' | 'wide' | 'wider' | 'extra';
  pomodoroEnabled: boolean;
  pomodoroWork: number;
  pomodoroBreak: number;
  reducedDistractions: boolean;
  predictableNavigation: boolean;
  ttsEnabled: boolean;
  ttsSpeed: number;
  reducedMotion?: boolean;
  highContrast?: boolean;
}

export interface IUser extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  isEmailVerified: boolean;
  onboardingComplete: boolean;
  tokenVersion: number;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  verificationSentAt?: Date;
  avatar?: string;
  learningTrack: LearningTrack;
  neurodivergentType: NeurodivergentType;
  accessibility: AccessibilitySettings;
  skills: string[];
  interests: string[];
  timezone: string;
  communicationStyle: 'text' | 'voice' | 'video' | 'mixed';
  xp: number;
  level: number;
  streak: number;
  lastActive: Date;
  isOnline: boolean;
  socketId?: string;
  unlockedRewards?: string[];
  comparePassword(password: string): Promise<boolean>;
  getSignedJwtToken(): string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest extends Request {
  user?: IUser;
}

export interface ITopic extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  domain: string;
  prerequisites: Types.ObjectId[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  tags: string[];
  resources: { type: string; url: string; title: string }[];
}

export interface IStudentProgress extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  topicId: Types.ObjectId;
  retentionRate: number;
  easinessFactor: number;
  interval: number;
  repetitions: number;
  confidence: number;
  mastery: number;
  predictedForgetDate: Date;
  lastReviewDate: Date;
  nextReviewDate: Date;
  memoryStrength: number;
  learningVelocity: number;
  totalAttempts: number;
  correctAttempts: number;
  reviewHistory: { date: Date; quality: number; responseTime: number; correct: boolean }[];
}

export interface IReviewHistory extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  topicId: Types.ObjectId;
  quality: number;
  responseTime: number;
  correct: boolean;
  previousInterval: number;
  newInterval: number;
  previousEasiness: number;
  newEasiness: number;
}

export interface ICareerPath extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  dreamJob: string;
  company: string;
  parsedSyllabus: { concepts: string[]; chapters: string[]; prerequisites: string[]; domain: string };
  requiredSkills: string[];
  industryExpectations: string[];
  interviewTopics: string[];
  techStack: string[];
  pdfUrl?: string;
  pdfPublicId?: string;
  syllabusChunks?: { text: string; embedding: number[] }[];
}

export interface ICareerMatch extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  careerPathId: Types.ObjectId;
  matchedSkills: string[];
  missingSkills: { skill: string; priority: string; difficulty: string; timeEstimate: string }[];
  overallMatch: number;
}

export interface IRoadmap extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  careerPathId: Types.ObjectId;
  duration: number;
  months: { month: number; title: string; goals: string[]; skills: string[]; projects: string[]; resources: string[]; milestones: string[] }[];
  interviewQuestions: string[];
  status: 'active' | 'completed' | 'paused';
  progress: number;
  isPublic?: boolean;
}

export interface IResume extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  careerPathId?: Types.ObjectId;
  content: {
    name: string; email: string; phone: string; summary: string;
    education: { institution: string; degree: string; year: string; gpa?: string }[];
    skills: { category: string; items: string[] }[];
    projects: { name: string; description: string; technologies: string[]; link?: string }[];
    certifications: { name: string; issuer: string; date: string }[];
    achievements: string[];
    experience: { company: string; role: string; duration: string; bullets: string[] }[];
  };
  templateId: string;
  pdfUrl?: string;
}

export interface IPeerTutor extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  subjects: string[];
  rating: number;
  totalSessions: number;
  totalRatings: number;
  availability: { day: string; startTime: string; endTime: string }[];
  maxSessionDuration: number;
  preferredSessionDuration: number;
  bio: string;
  xpEarned: number;
  isActive: boolean;
}

export interface IPeerSession extends Document {
  _id: Types.ObjectId;
  tutorId: Types.ObjectId;
  studentId: Types.ObjectId;
  topicId?: Types.ObjectId;
  subject: string;
  status: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled';
  scheduledAt: Date;
  duration: number;
  rating?: number;
  feedback?: string;
  chatMessages: { senderId: Types.ObjectId; message: string; timestamp: Date }[];
}

export type GroupRole = 'timekeeper' | 'notetaker' | 'questionmaster' | 'presenter' | 'member';

export interface IStudyGroup extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  createdBy: Types.ObjectId;
  members: { userId: Types.ObjectId; role: GroupRole; joinedAt: Date }[];
  maxMembers: number;
  goals: string[];
  skills: string[];
  timezone: string;
  accessibilityFeatures: string[];
  neurodivergentFriendly: boolean;
  schedule: { day: string; time: string; duration: number }[];
  isActive: boolean;
  compatibilityScore?: number;
}

export interface IGroupMeeting extends Document {
  _id: Types.ObjectId;
  groupId: Types.ObjectId;
  title: string;
  agenda: string[];
  scheduledAt: Date;
  duration: number;
  attendees: Types.ObjectId[];
  notes: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: 'review' | 'tutor' | 'group' | 'career' | 'achievement' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date;
}

export interface SocketUser {
  userId: string;
  socketId: string;
  name: string;
}

export interface ChatMessage {
  senderId: string;
  senderName: string;
  message: string;
  roomId: string;
  timestamp: Date;
}
