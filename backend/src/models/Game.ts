import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IGameQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface IGame extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  description: string;
  sourceType: 'pdf' | 'text' | 'topic';
  sourceContent: string;
  sourceChunks: string[]; // Store in chunks for the PDF reader
  syllabusChunks?: { text: string; embedding: number[] }[];
  questions: IGameQuestion[];
  gameType: 'quiz' | 'flashcard' | 'match' | 'fillblank';
  totalQuestions: number;
  timeLimit: number;
  pdfUrl?: string;
  pdfPublicId?: string;
  isPublic: boolean;
  topicId?: Types.ObjectId;
  createdAt: Date;
}

export interface IGameSession extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  gameId: Types.ObjectId;
  answers: { questionIndex: number; selectedAnswer: number; correct: boolean; timeTaken: number }[];
  score: number;
  totalPoints: number;
  accuracy: number;
  timeTaken: number;
  xpEarned: number;
  completed: boolean;
  createdAt: Date;
}

const gameSchema = new Schema<IGame>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  sourceType: { type: String, enum: ['pdf', 'text', 'topic'], required: true },
  sourceContent: { type: String, default: '' },
  sourceChunks: [{ type: String }],
  syllabusChunks: [{ text: { type: String }, embedding: [{ type: Number }] }],
  pdfUrl: { type: String, default: '', select: false },
  pdfPublicId: { type: String, default: '', select: false },
  isPublic: { type: Boolean, default: false },
  topicId: { type: Schema.Types.ObjectId, ref: 'Topic' },
  questions: [{
    question: { type: String, required: true },
    options: [{ type: String }],
    correctAnswer: { type: Number, required: true },
    explanation: { type: String, default: '' },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
    points: { type: Number, default: 10 },
  }],
  gameType: { type: String, enum: ['quiz', 'flashcard', 'match', 'fillblank'], default: 'quiz' },
  totalQuestions: { type: Number, default: 0 },
  timeLimit: { type: Number, default: 300 },
}, { timestamps: true });

gameSchema.index({ userId: 1, createdAt: -1 });

const gameSessionSchema = new Schema<IGameSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  answers: [{
    questionIndex: Number,
    selectedAnswer: Number,
    correct: Boolean,
    timeTaken: Number,
  }],
  score: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 },
  accuracy: { type: Number, default: 0 },
  timeTaken: { type: Number, default: 0 },
  xpEarned: { type: Number, default: 0 },
  completed: { type: Boolean, default: false },
}, { timestamps: true });

gameSessionSchema.index({ userId: 1, gameId: 1 });

export const Game = mongoose.model<IGame>('Game', gameSchema);
export const GameSession = mongoose.model<IGameSession>('GameSession', gameSessionSchema);
