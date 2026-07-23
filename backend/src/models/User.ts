import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { IUser } from '../types';

const accessibilitySchema = new Schema({
  fontSize: { type: String, enum: ['small','medium','normal','large','xlarge'], default: 'medium' },
  colorContrast: { type: String, enum: ['normal','high','dark','light','cyberpunk','cosmic'], default: 'normal' },
  animations: { type: Boolean, default: true },
  readingMode: { type: Boolean, default: false },
  audioMode: { type: Boolean, default: false },
  focusMode: { type: Boolean, default: false },
  fontFamily: { type: String, enum: ['default','opendyslexic','arial','verdana','vazirmatn'], default: 'default' },
  lineSpacing: { type: String, enum: ['normal','wide','wider','extra'], default: 'normal' },
  pomodoroEnabled: { type: Boolean, default: false },
  pomodoroWork: { type: Number, default: 25 },
  pomodoroBreak: { type: Number, default: 5 },
  reducedDistractions: { type: Boolean, default: false },
  predictableNavigation: { type: Boolean, default: false },
  ttsEnabled: { type: Boolean, default: false },
  ttsSpeed: { type: Number, default: 1 },
  reducedMotion: { type: Boolean, default: false },
  highContrast: { type: Boolean, default: false },
}, { _id: false });

const userSchema = new Schema<IUser>({
  name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
  email: { type: String, required: [true, 'Email is required'], unique: true, lowercase: true, match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'] },
  password: { type: String, required: [true, 'Password is required'], minlength: 8, maxlength: 128, select: false },
  isEmailVerified: { type: Boolean, default: true },
  onboardingComplete: { type: Boolean, default: true },
  emailVerificationToken: { type: String, select: false },
  emailVerificationExpires: { type: Date, select: false },
  passwordResetToken: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  verificationSentAt: { type: Date, select: false },
  tokenVersion: { type: Number, default: 0, select: false },
  role: { type: String, enum: ['student','tutor','admin'], default: 'student' },
  avatar: { type: String, default: '' },
  learningTrack: { type: String, enum: ['normal','neurodivergent'], default: 'normal' },
  neurodivergentType: { type: String, enum: ['adhd','autism','dyslexia','none'], default: 'none' },
  accessibility: { type: accessibilitySchema, default: () => ({}) },
  skills: [{ type: String }],
  interests: [{ type: String }],
  timezone: { type: String, default: 'UTC' },
  communicationStyle: { type: String, enum: ['text','voice','video','mixed'], default: 'text' },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  streak: { type: Number, default: 0 },
  unlockedRewards: [{ type: String }],
  lastActive: { type: Date, default: Date.now },
  isOnline: { type: Boolean, default: false },
  socketId: { type: String },
}, { timestamps: true });

// Only explicit indexes — email already has unique:true which creates an index
userSchema.index({ learningTrack: 1, neurodivergentType: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.getSignedJwtToken = function(): string {
  return jwt.sign(
    { id: this._id, role: this.role, version: this.tokenVersion || 0 },
    process.env.JWT_SECRET || 'development-only-change-me',
    { expiresIn: (process.env.JWT_EXPIRE || '7d') as any }
  );
};

export default mongoose.model<IUser>('User', userSchema);
