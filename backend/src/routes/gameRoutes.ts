import { Router } from 'express';
import { createGameFromPDF, createGameFromText, getMyGames, getGame, submitGameSession, getGameHistory, getLeaderboard, getRecommendedGames, deleteGame } from '../controllers/gameController';
import { protect } from '../middleware/auth';
import { upload } from '../middleware/upload';

const r = Router();
r.post('/from-pdf', protect, upload.single('pdf'), createGameFromPDF);
r.post('/from-text', protect, createGameFromText);
r.get('/my-games', protect, getMyGames);
r.get('/history', protect, getGameHistory);
r.get('/leaderboard', protect, getLeaderboard);
r.get('/recommended', protect, getRecommendedGames);
r.get('/:id', protect, getGame);
r.delete('/:id', protect, deleteGame);
r.post('/submit', protect, submitGameSession);

export default r;
