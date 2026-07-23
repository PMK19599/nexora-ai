import { Router } from 'express';
import { uploadSyllabus, analyze, generateRoadmap, getGapAnalysis, getIndustryInsights, getCareerPaths, getRoadmaps, importRoadmap, getSharedRoadmaps, shareRoadmap, deleteCareerPath } from '../controllers/careerController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const r = Router();
r.post('/upload-syllabus', protect, upload.single('syllabus'), uploadSyllabus);
r.post('/analyze', protect, analyze);
r.post('/generate-roadmap', protect, generateRoadmap);
r.get('/gap-analysis', protect, getGapAnalysis);
r.get('/industry-insights', protect, getIndustryInsights);
r.get('/paths', protect, getCareerPaths);
r.delete('/paths/:id', protect, deleteCareerPath);
r.get('/roadmaps', protect, getRoadmaps);
r.post('/import-roadmap', protect, importRoadmap);
r.get('/shared-roadmaps', protect, getSharedRoadmaps);
r.post('/share-roadmap', protect, shareRoadmap);

export default r;
