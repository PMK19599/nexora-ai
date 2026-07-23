import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { User, Topic } from '../models';

const topics = [
  { title: 'Data Structures', description: 'Arrays, linked lists, trees, graphs', domain: 'Computer Science', difficulty: 'beginner', estimatedHours: 40, tags: ['programming','algorithms'] },
  { title: 'Algorithms', description: 'Sorting, searching, dynamic programming', domain: 'Computer Science', difficulty: 'intermediate', estimatedHours: 60, tags: ['programming','algorithms'] },
  { title: 'System Design', description: 'Distributed systems, scalability, caching', domain: 'Computer Science', difficulty: 'advanced', estimatedHours: 50, tags: ['architecture'] },
  { title: 'Calculus', description: 'Limits, derivatives, integrals', domain: 'Mathematics', difficulty: 'intermediate', estimatedHours: 45, tags: ['math'] },
  { title: 'Linear Algebra', description: 'Vectors, matrices, eigenvalues', domain: 'Mathematics', difficulty: 'intermediate', estimatedHours: 35, tags: ['math'] },
  { title: 'Probability & Statistics', description: 'Distributions, hypothesis testing', domain: 'Mathematics', difficulty: 'intermediate', estimatedHours: 40, tags: ['math','statistics'] },
  { title: 'Machine Learning', description: 'Supervised/unsupervised learning, neural networks', domain: 'AI/ML', difficulty: 'advanced', estimatedHours: 80, tags: ['ai','ml'] },
  { title: 'React Development', description: 'Hooks, state management, routing', domain: 'Web Development', difficulty: 'intermediate', estimatedHours: 30, tags: ['react','frontend'] },
  { title: 'Node.js & Express', description: 'REST APIs, middleware', domain: 'Web Development', difficulty: 'intermediate', estimatedHours: 35, tags: ['nodejs','backend'] },
  { title: 'Database Design', description: 'SQL/NoSQL, normalization, indexing', domain: 'Computer Science', difficulty: 'intermediate', estimatedHours: 25, tags: ['database'] },
  { title: 'Cloud Computing', description: 'AWS, GCP, Azure fundamentals', domain: 'DevOps', difficulty: 'intermediate', estimatedHours: 40, tags: ['cloud','devops'] },
  { title: 'Python Programming', description: 'Fundamentals, OOP, libraries', domain: 'Computer Science', difficulty: 'beginner', estimatedHours: 25, tags: ['python'] },
  { title: 'Docker & Kubernetes', description: 'Containerization, orchestration', domain: 'DevOps', difficulty: 'intermediate', estimatedHours: 30, tags: ['docker','kubernetes'] },
  { title: 'NLP', description: 'Text processing, transformers, sentiment analysis', domain: 'AI/ML', difficulty: 'advanced', estimatedHours: 50, tags: ['ai','nlp'] },
  { title: 'Differential Equations', description: 'ODEs, PDEs, Laplace transforms', domain: 'Mathematics', difficulty: 'advanced', estimatedHours: 40, tags: ['math'] },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nexora');
    await Topic.deleteMany({});
    const createdTopics = await Topic.insertMany(topics);
    if (process.env.SEED_ADMIN_EMAIL && process.env.SEED_ADMIN_PASSWORD) {
      await User.findOneAndUpdate(
        { email: process.env.SEED_ADMIN_EMAIL.trim().toLowerCase() },
        { name: 'Configured Admin', password: process.env.SEED_ADMIN_PASSWORD, role: 'admin', isEmailVerified: true },
        { upsert: true, runValidators: true }
      );
    }
    console.log(`Seeded ${createdTopics.length} topics. Optional admin is controlled by local environment variables.`);
    process.exit(0);
  } catch (e) { console.error('[SeedService] Seed failed:', e instanceof Error ? e.message : 'Unknown error'); process.exit(1); }
})();
