import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { Game, GameSession } from '../models/Game';
import { User, Topic } from '../models';
import { Types } from 'mongoose';
import pdfParse from 'pdf-parse';
import fs from 'fs';
import { askAI, getEmbedding } from '../utils/ai';
import { uploadToCloudinary, deleteFromCloudinary } from '../config/cloudinary';
import { sliceTextIntoChunks, getRepresentativeChunks } from '../utils/embeddings';

export const resolveUserTopicForQuiz = async (
  userId: string | Types.ObjectId,
  rawTitle?: string,
  explicitTopicId?: string | Types.ObjectId
): Promise<Types.ObjectId> => {
  if (explicitTopicId) {
    if (typeof explicitTopicId === 'string' && Types.ObjectId.isValid(explicitTopicId)) {
      return new Types.ObjectId(explicitTopicId);
    }
    if (explicitTopicId instanceof Types.ObjectId) {
      return explicitTopicId;
    }
  }

  const cleanTitle = (rawTitle || '')
    .replace(/^(Quiz from PDF:|Quiz:|Quick Quiz:)\s*/gi, '')
    .trim();

  const topicTitle = (!cleanTitle || cleanTitle.toLowerCase() === 'quick quiz')
    ? 'Study Notes'
    : cleanTitle;

  const userTag = `user:${userId.toString()}`;
  const escapedTitle = topicTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  let topic = await Topic.findOne({
    title: { $regex: new RegExp(`^${escapedTitle}$`, 'i') },
    tags: userTag,
  });

  if (!topic) {
    topic = await Topic.create({
      title: topicTitle,
      description: `Study notes topic for ${topicTitle}`,
      domain: 'Notes',
      difficulty: 'beginner',
      tags: [userTag, 'notes-generated'],
    });
  }

  return topic._id;
};

async function generateQuestionsWithAI(text: string, count: number = 10, recentAccuracy: number = 70): Promise<any[]> {
  const localFallback = () => ({ questions: generateQuestionsFromText(text, count, recentAccuracy) });

  const prompt = `We want to generate a personalized learning quiz from the following reference text.
Reference Material (Excerpt):
"${text.substring(0, 8000)}"

Quiz Size: Please generate exactly ${count} multiple-choice questions.
Target Cognitive Style: The student's recent performance accuracy is ${recentAccuracy}%.
Adjust the difficulty mix:
- If accuracy is < 50%: Focus on factual recall ("easy" difficulty).
- If accuracy is > 85%: Focus on deep concept checks, reasoning, and synthesis ("hard" difficulty).
- Otherwise: Generate a balanced mix of "easy", "medium", and "hard" questions.

Please return a JSON object containing the questions array matching the format:
{
  "questions": [
    {
      "question": "What is the primary role of...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "explanation": "Detailed conceptual explanation of why the answer is correct.",
      "difficulty": "easy" | "medium" | "hard",
      "points": 10
    }
  ]
}`;

  try {
    const result = await askAI<{ questions: any[] }>(
      prompt,
      localFallback,
      'You are an expert AI tutor. Generate conceptual multiple-choice questions from reference material. Respond with valid JSON only.'
    );
    if (result && Array.isArray(result.questions) && result.questions.length > 0) {
      return result.questions.slice(0, count);
    }
  } catch (err) {
    console.warn('AI Quiz generation failed, falling back:', err);
  }
  return localFallback().questions;
}

// Generates quiz questions from text content without needing Claude API
function generateQuestionsFromText(text: string, count: number = 10, recentAccuracy: number = 70): any[] {
  const sentences = text
    .replace(/\n+/g, '. ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 300);

  const questions: any[] = [];
  const used = new Set<number>();

  // Extract key terms and concepts
  const words = text.split(/\s+/);
  const wordFreq: Record<string, number> = {};
  words.forEach(w => {
    const clean = w.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (clean.length > 4) wordFreq[clean] = (wordFreq[clean] || 0) + 1;
  });
  const keyTerms = Object.entries(wordFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  for (let i = 0; i < Math.min(count, sentences.length); i++) {
    let idx: number;
    do { idx = Math.floor(Math.random() * sentences.length); } while (used.has(idx) && used.size < sentences.length);
    used.add(idx);

    const sentence = sentences[idx];
    if (!sentence) continue;

    // Find a key word in the sentence to make a question about
    const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 4);
    if (sentenceWords.length < 3) continue;

    const targetWord = sentenceWords[Math.floor(Math.random() * sentenceWords.length)].replace(/[^a-zA-Z]/g, '');
    if (!targetWord || targetWord.length < 3) continue;

    // Create fill-in-blank style question
    const blank = sentence.replace(new RegExp(targetWord, 'i'), '______');

    // Generate wrong answers from key terms
    const wrongAnswers = keyTerms
      .filter(t => t.toLowerCase() !== targetWord.toLowerCase())
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    if (wrongAnswers.length < 3) {
      wrongAnswers.push('None of the above', 'All of the above', 'Cannot be determined');
    }

    const options = [...wrongAnswers.slice(0, 3), targetWord].sort(() => Math.random() - 0.5);
    const correctAnswer = options.indexOf(targetWord);

    let diff: 'easy' | 'medium' | 'hard' = 'medium';
    
    // Adaptive logic: If struggling (< 50%), mostly easy. If excelling (> 85%), mostly hard.
    if (recentAccuracy < 50) {
      diff = i < (count * 0.8) ? 'easy' : 'medium';
    } else if (recentAccuracy > 85) {
      diff = i < (count * 0.3) ? 'medium' : 'hard';
    } else {
      diff = i < count / 3 ? 'easy' : i < (count * 2) / 3 ? 'medium' : 'hard';
    }

    questions.push({
      question: `Fill in the blank:\n"${blank}"`,
      options,
      correctAnswer,
      explanation: `The correct answer is "${targetWord}". Original: "${sentence}"`,
      difficulty: diff,
      points: diff === 'easy' ? 10 : diff === 'medium' ? 20 : 30,
    });
  }

  // Add True/False questions (easier)
  for (let i = 0; i < Math.min(5, sentences.length); i++) {
    const idx = Math.floor(Math.random() * sentences.length);
    const sentence = sentences[idx];
    if (!sentence || sentence.length < 25) continue;

    questions.push({
      question: `True or False:\n"${sentence}"`,
      options: ['True', 'False', 'Partially True', 'Not enough information'],
      correctAnswer: 0,
      explanation: `This statement is from the source material: "${sentence}"`,
      difficulty: 'easy' as const,
      points: 10,
    });
  }

  return questions.slice(0, count);
}

export const createGameFromPDF = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ success: false, message: 'Please upload a PDF file' }); return; }

    // Upload to Cloudinary for production reference storage
    let pdfUrl = '';
    let pdfPublicId = '';
    try {
      const uploadRes = await uploadToCloudinary(file.path, 'nexora_pdfs');
      pdfUrl = uploadRes.url;
      pdfPublicId = uploadRes.publicId;
    } catch (err) {
      console.warn('Failed to upload PDF to Cloudinary:', err);
    }

    const pdfBuffer = fs.readFileSync(file.path);
    const pdfData = await pdfParse(pdfBuffer);
    const text = pdfData.text;

    // Clean up local file temp storage
    try { fs.unlinkSync(file.path); } catch {}

    if (!text || text.trim().length < 50) {
      res.status(400).json({ success: false, message: 'Could not extract enough text from the PDF. Try a different file.' });
      return;
    }

    // ADAPTIVE LOGIC: Fetch recent performance
    const recentSessions = await GameSession.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(3);
    const recentAccuracy = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length 
      : 70;

    // Sliding-Window Chunking and Semantic Embeddings pipeline
    const chunks = sliceTextIntoChunks(text, 1000, 200);
    if (chunks.length === 0) {
      res.status(400).json({ success: false, message: 'Could not extract enough text chunks from the PDF. Try a different file.' });
      return;
    }

    const syllabusChunks = [];
    for (const chunk of chunks) {
      const embedding = await getEmbedding(chunk);
      syllabusChunks.push({ text: chunk, embedding });
    }

    // Sample representative chunks to avoid context window size issues
    const repChunks = getRepresentativeChunks(chunks, 8);
    const contextText = repChunks.join('\n\n');

    const title = req.body.title || `Quiz from PDF: ${file.originalname}` ;
    const count = Math.min(parseInt(req.body.questionCount) || 10, 20);
    const questions = await generateQuestionsWithAI(contextText, count, recentAccuracy);

    if (questions.length === 0) {
      res.status(400).json({ success: false, message: 'Could not generate questions from this PDF. The content may be too short or not text-based.' });
      return;
    }

    const topicId = await resolveUserTopicForQuiz(req.user!._id, title, req.body.topicId);

    const game = await Game.create({
      userId: req.user!._id,
      title,
      description: `Generated from ${file.originalname}. ${questions.length} questions.`,
      sourceType: 'pdf',
      sourceContent: text.substring(0, 5000), // Keep for backwards compatibility
      sourceChunks: chunks,
      syllabusChunks,
      pdfUrl,
      pdfPublicId,
      topicId,
      questions,
      gameType: req.body.gameType || 'quiz',
      totalQuestions: questions.length,
      timeLimit: questions.length * 30,
    });

    res.status(201).json({ success: true, data: game });
  } catch (e) { next(e); }
};

export const createGameFromText = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, content, questionCount, gameType } = req.body;

    if (!content || content.trim().length < 50) {
      res.status(400).json({ success: false, message: 'Please provide at least 50 characters of study content.' });
      return;
    }

    // ADAPTIVE LOGIC: Fetch recent performance
    const recentSessions = await GameSession.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(3);
    const recentAccuracy = recentSessions.length > 0 
      ? recentSessions.reduce((sum, s) => sum + s.accuracy, 0) / recentSessions.length 
      : 70;

    const count = Math.min(parseInt(questionCount) || 10, 20);
    const questions = await generateQuestionsWithAI(content, count, recentAccuracy);

    if (questions.length === 0) {
      res.status(400).json({ success: false, message: 'Could not generate questions. Try adding more detailed content.' });
      return;
    }

    const topicId = await resolveUserTopicForQuiz(req.user!._id, title, req.body.topicId);

    const game = await Game.create({
      userId: req.user!._id,
      title: title || 'Quick Quiz',
      description: `${questions.length} questions from your notes`,
      sourceType: 'text',
      sourceContent: content.substring(0, 5000),
      topicId,
      questions,
      gameType: gameType || 'quiz',
      totalQuestions: questions.length,
      timeLimit: questions.length * 30,
    });

    res.status(201).json({ success: true, data: game });
  } catch (e) { next(e); }
};

export const getMyGames = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const games = await Game.find({ userId: req.user!._id }).sort({ createdAt: -1 }).select('-sourceContent');
    res.json({ success: true, data: games });
  } catch (e) { next(e); }
};

export const getGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const game = await Game.findOne({ _id: req.params.id, $or: [{ userId: req.user!._id }, { isPublic: true }] });
    if (!game) { res.status(404).json({ success: false, message: 'Game not found' }); return; }
    res.json({ success: true, data: game });
  } catch (e) { next(e); }
};

export const submitGameSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { gameId, answers, timeTaken } = req.body;

    if (!gameId || typeof gameId !== 'string') { res.status(400).json({ success: false, message: 'gameId is required and must be a string' }); return; }
    if (!answers || !Array.isArray(answers)) { res.status(400).json({ success: false, message: 'answers is required and must be an array' }); return; }

    const game = await Game.findOne({ _id: gameId, $or: [{ userId: req.user!._id }, { isPublic: true }] });
    if (!game) { res.status(404).json({ success: false, message: 'Game not found' }); return; }

    let score = 0;
    let totalPoints = 0;
    const processedAnswers = answers.map((a: any) => {
      const q = game.questions[a.questionIndex];
      if (!q) return { ...a, correct: false };
      totalPoints += q.points;
      const correct = a.selectedAnswer === q.correctAnswer;
      if (correct) score += q.points;
      return { ...a, correct };
    });

    const accuracy = answers.length > 0 ? Math.round((processedAnswers.filter((a: any) => a.correct).length / answers.length) * 100) : 0;
    const xpEarned = Math.round(score / 2) + (accuracy >= 80 ? 50 : accuracy >= 60 ? 25 : 10);

    const session = await GameSession.create({
      userId: req.user!._id,
      gameId,
      answers: processedAnswers,
      score,
      totalPoints,
      accuracy,
      timeTaken: timeTaken || 0,
      xpEarned,
      completed: true,
    });

    // Award XP and calculate level progression
    const user = await User.findById(req.user!._id);
    let levelUp = false;
    let newLevel = user ? user.level : 1;
    let autoAdapted = false;
    let adaptationMsg = '';

    if (user) {
      const oldLevel = user.level || 1;
      const newXp = (user.xp || 0) + xpEarned;
      newLevel = Math.floor(newXp / 500) + 1;
      user.xp = newXp;
      if (newLevel > oldLevel) {
        user.level = newLevel;
        levelUp = true;
        // Create level up notification
        const NotificationModel = require('../models/Notification').default || require('../models/Notification');
        if (NotificationModel) {
          await NotificationModel.create({
            userId: user._id,
            type: 'system',
            title: `Level Up! 🎉`,
            message: `Congratulations! You reached Level ${newLevel}! Keep learning to unlock new styles and rewards.`,
          });
        }
      }

      // Dynamic pacing adaptation logic based on recent session history
      const recent = await GameSession.find({ userId: req.user!._id }).sort({ createdAt: -1 }).limit(2);
      const accuracies = [accuracy, ...recent.map(s => s.accuracy)];
      const avgAccuracy = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;

      if (accuracies.length >= 2) {
        if (avgAccuracy >= 85) {
          if (user.accessibility.pomodoroEnabled && user.accessibility.pomodoroWork < 35) {
            user.accessibility.pomodoroWork += 5;
            autoAdapted = true;
            adaptationMsg = `Based on your excellent performance (average accuracy ${Math.round(avgAccuracy)}%), we have extended your Pomodoro focus duration to ${user.accessibility.pomodoroWork} minutes!`;
          }
          if (user.accessibility.ttsEnabled && user.accessibility.ttsSpeed < 1.4) {
            user.accessibility.ttsSpeed = Math.round((user.accessibility.ttsSpeed + 0.1) * 10) / 10;
            autoAdapted = true;
            adaptationMsg += ` Also, we've slightly accelerated the text-to-speech voice reading speed to ${user.accessibility.ttsSpeed}x.`;
          }
        } else if (avgAccuracy < 60) {
          if (user.accessibility.pomodoroEnabled && user.accessibility.pomodoroWork > 15) {
            user.accessibility.pomodoroWork = Math.max(15, user.accessibility.pomodoroWork - 5);
            autoAdapted = true;
            adaptationMsg = `We adapted your Pomodoro focus blocks to ${user.accessibility.pomodoroWork} minutes to help you maintain high focus.`;
          }
          if (user.accessibility.ttsEnabled && user.accessibility.ttsSpeed > 0.8) {
            user.accessibility.ttsSpeed = Math.round((user.accessibility.ttsSpeed - 0.1) * 10) / 10;
            autoAdapted = true;
            if (adaptationMsg) {
              adaptationMsg += ` We've slowed down text-to-speech to ${user.accessibility.ttsSpeed}x to help you digest details.`;
            } else {
              adaptationMsg = `We've adapted your text-to-speech reading speed slightly to ${user.accessibility.ttsSpeed}x to help you follow along.`;
            }
          }
          if (user.neurodivergentType === 'dyslexia' && user.accessibility.fontFamily !== 'opendyslexic') {
            user.accessibility.fontFamily = 'opendyslexic';
            autoAdapted = true;
            adaptationMsg += ` Enabled OpenDyslexic reading font helper.`;
          }
        }

        if (autoAdapted) {
          const NotificationModel = require('../models/Notification').default || require('../models/Notification');
          if (NotificationModel) {
            await NotificationModel.create({
              userId: user._id,
              type: 'system',
              title: '🔄 Learning Environment Adapted!',
              message: adaptationMsg,
            });
          }
        }
      }

      await user.save();
    }

    // Connect to SM-2 Spaced Repetition Loop
    let topicId = game.topicId;
    if (!topicId) {
      topicId = await resolveUserTopicForQuiz(req.user!._id, game.title);
      if (topicId) {
        game.topicId = topicId;
        await game.save();
      }
    }
    if (topicId) {
      const reviewService = require('../services/reviewService');
      if (reviewService && typeof reviewService.logReviewAttempt === 'function') {
        const quality = accuracy >= 90 ? 5 : accuracy >= 80 ? 4 : accuracy >= 60 ? 3 : accuracy >= 40 ? 2 : 1;
        const avgResponseTime = answers.length > 0 ? Math.round(timeTaken / answers.length) : 0;
        await reviewService.logReviewAttempt(
          req.user!._id.toString(),
          topicId.toString(),
          quality,
          avgResponseTime,
          accuracy >= 60
        );
      }
    }

    res.status(201).json({ success: true, data: { session, xpEarned, accuracy, score, totalPoints, levelUp, newLevel } });
  } catch (e) { next(e); }
};

export const getGameHistory = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const sessions = await GameSession.find({ userId: req.user!._id })
      .populate('gameId', 'title gameType totalQuestions')
      .sort({ createdAt: -1 })
      .limit(20);
    res.json({ success: true, data: sessions });
  } catch (e) { next(e); }
};

export const getLeaderboard = async (_req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const leaders = await GameSession.aggregate([
      { $group: { _id: '$userId', totalScore: { $sum: '$score' }, gamesPlayed: { $sum: 1 }, avgAccuracy: { $avg: '$accuracy' } } },
      { $sort: { totalScore: -1 } },
      { $limit: 20 },
      { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
      { $unwind: '$user' },
      { $project: { name: '$user.name', avatar: '$user.avatar', totalScore: 1, gamesPlayed: 1, avgAccuracy: { $round: ['$avgAccuracy', 0] } } },
    ]);
    res.json({ success: true, data: leaders });
  } catch (e) { next(e); }
};

export const deleteGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try { const game = await Game.findOneAndDelete({ _id: req.params.id, userId: req.user!._id }).select('+pdfPublicId'); if (!game) { res.status(404).json({ success:false, message:'Quiz not found' }); return; } if ((game as any).pdfPublicId) { try { await deleteFromCloudinary((game as any).pdfPublicId); } catch {} } await GameSession.deleteMany({ gameId: game._id, userId: req.user!._id }); res.json({ success:true, message:'Quiz and its saved sessions were deleted.' }); } catch(e) { next(e); }
};

export const getRecommendedGames = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Collaborative filtering for curriculum sharing
    const me = await User.findById(req.user!._id);
    if (!me) { res.status(404).json({ success: false, message: 'User not found' }); return; }

    // Find similar users (same neurodivergent type, similar interests/skills)
    const similarUsers = await User.find({
      _id: { $ne: me._id },
      $or: [
        { neurodivergentType: me.neurodivergentType },
        { interests: { $in: me.interests || [] } }
      ]
    }).limit(20);

    const similarUserIds = similarUsers.map(u => u._id);

    // Get highly rated or completed games from those similar users
    const recommendedGames = await Game.find({
      userId: { $in: similarUserIds }, isPublic: true
    })
    .sort({ createdAt: -1 })
    .limit(5)
    .populate('userId', 'name neurodivergentType');

    res.json({ success: true, data: recommendedGames });
  } catch (e) { next(e); }
};
