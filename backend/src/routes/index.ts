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
import { protect } from '../middleware/auth';

const r = Router();
r.use('/auth', auth);
r.use('/review', protect, review);
r.use('/career', protect, career);
r.use('/tutors', protect, tutors);
r.use('/groups', protect, groups);
r.use('/topics', protect, topics);
r.use('/admin', protect, admin);
r.use('/games', protect, games);
r.use('/privacy', privacy);

export default r;
