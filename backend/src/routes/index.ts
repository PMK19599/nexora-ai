import { Router } from 'express';
import auth from './authRoutes';
import review from './reviewRoutes';
import career from './careerRoutes';
import tutors from './tutorRoutes';
import groups from './groupRoutes';
import topics from './topicRoutes';
import admin from './adminRoutes';
import games from './gameRoutes';
import privacy from './privacyRoutes';
import { protect, requireVerified } from '../middleware/auth';

const r = Router();
r.use('/auth', auth);
r.use('/review', protect, requireVerified, review);
r.use('/career', protect, requireVerified, career);
r.use('/tutors', protect, requireVerified, tutors);
r.use('/groups', protect, requireVerified, groups);
r.use('/topics', protect, requireVerified, topics);
r.use('/admin', protect, requireVerified, admin);
r.use('/games', protect, requireVerified, games);
r.use('/privacy', privacy);

export default r;
