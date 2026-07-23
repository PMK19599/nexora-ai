import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import * as svc from '../services/careerService';
import { CareerPath, Roadmap, User } from '../models';
import { deleteFromCloudinary } from '../config/cloudinary';

export const uploadSyllabus = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.file) { res.status(400).json({ success: false, message: 'Upload a PDF' }); return; }
    res.status(201).json({ success: true, data: await svc.uploadAndAnalyzeSyllabus(req.user!._id.toString(), req.file.path, req.body.dreamJob, req.body.company) });
  } catch (e) { next(e); }
};

export const analyze = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { dreamJob, company, skills } = req.body;
    if (skills?.length) await User.findByIdAndUpdate(req.user!._id, { skills });
    res.status(201).json({ success: true, data: await svc.analyzeCareer(req.user!._id.toString(), dreamJob, company, skills || req.user!.skills || []) });
  } catch (e) { next(e); }
};

export const generateRoadmap = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    await svc.getGapAnalysis(req.user!._id.toString(), req.body.careerPathId);
    res.status(201).json({ success: true, data: await svc.generateRoadmap(req.user!._id.toString(), req.body.careerPathId, req.body.duration || 6) });
  } catch (e) { next(e); }
};

export const getGapAnalysis = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!req.query.careerPathId) { res.status(400).json({ success: false, message: 'careerPathId required' }); return; }
    res.json({ success: true, data: await svc.getGapAnalysis(req.user!._id.toString(), req.query.careerPathId as string) });
  } catch (e) { next(e); }
};

export const getIndustryInsights = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await svc.getIndustryInsights(req.query.dreamJob as string, req.query.company as string) }); } catch (e) { next(e); }
};

export const getCareerPaths = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await CareerPath.find({ userId: req.user!._id }).sort({ createdAt: -1 }) }); } catch (e) { next(e); }
};

export const deleteCareerPath = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { const path = await CareerPath.findOne({ _id: req.params.id, userId: req.user!._id }).select('+pdfPublicId'); if (!path) { res.status(404).json({ success:false, message:'Career path not found' }); return; } if ((path as any).pdfPublicId) { try { await deleteFromCloudinary((path as any).pdfPublicId); } catch {} } await Promise.all([CareerPath.deleteOne({ _id:path._id }), Roadmap.deleteMany({ careerPathId:path._id, userId:req.user!._id })]); res.json({ success:true, message:'Career path and uploaded syllabus were deleted.' }); } catch(e) { next(e); }
};

export const getRoadmaps = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { res.json({ success: true, data: await Roadmap.find({ userId: req.user!._id }).sort({ createdAt: -1 }) }); } catch (e) { next(e); }
};

export const importRoadmap = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roadmapId } = req.body;
    const originalRoadmap = await Roadmap.findById(roadmapId);
    if (!originalRoadmap) { res.status(404).json({ success: false, message: 'Original roadmap not found' }); return; }

    const newRoadmap = await Roadmap.create({
      userId: req.user!._id,
      careerPathId: originalRoadmap.careerPathId,
      duration: originalRoadmap.duration,
      months: originalRoadmap.months,
      interviewQuestions: originalRoadmap.interviewQuestions,
      status: 'active',
      progress: 0
    });

    res.status(201).json({ success: true, data: newRoadmap, message: 'Roadmap imported successfully!' });
  } catch (e) { next(e); }
};

export const shareRoadmap = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { roadmapId } = req.body;
    const roadmap = await Roadmap.findOneAndUpdate(
      { _id: roadmapId, userId: req.user!._id },
      { isPublic: true },
      { new: true }
    );
    if (!roadmap) { res.status(404).json({ success: false, message: 'Roadmap not found' }); return; }
    res.json({ success: true, message: 'Roadmap shared with peers successfully!', data: roadmap });
  } catch (e) { next(e); }
};

export const getSharedRoadmaps = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const me = await User.findById(req.user!._id);
    if (!me) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    const similarUsers = await User.find({
      _id: { $ne: me._id },
      neurodivergentType: me.neurodivergentType,
      role: 'student'
    }).limit(10);

    const userIds = similarUsers.map(u => u._id);
    const roadmaps = await Roadmap.find({
      userId: { $in: userIds },
      isPublic: true
    })
    .populate('userId', 'name neurodivergentType')
    .sort({ createdAt: -1 })
    .limit(10);

    res.json({ success: true, data: roadmaps });
  } catch (e) { next(e); }
};
