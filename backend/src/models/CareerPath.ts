import mongoose, { Schema } from 'mongoose';
import { ICareerPath } from '../types';
const schema = new Schema<ICareerPath>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  dreamJob: { type: String, required: true },
  company: { type: String, required: true },
  parsedSyllabus: { concepts: [String], chapters: [String], prerequisites: [String], domain: String },
  requiredSkills: [String],
  industryExpectations: [String],
  interviewTopics: [String],
  techStack: [String],
  pdfUrl: { type: String, default: '', select: false },
  pdfPublicId: { type: String, default: '', select: false },
  syllabusChunks: [{ text: { type: String }, embedding: [{ type: Number }] }],
}, { timestamps: true });
schema.index({ userId: 1 });
export default mongoose.model<ICareerPath>('CareerPath', schema);
