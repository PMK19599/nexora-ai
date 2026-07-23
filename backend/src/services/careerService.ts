import pdfParse from 'pdf-parse';
import fs from 'fs';
import { CareerPath, CareerMatch, Roadmap, User } from '../models';
import { Types } from 'mongoose';
import { askAI, getEmbedding } from '../utils/ai';
import { uploadToCloudinary } from '../config/cloudinary';
import { sliceTextIntoChunks, getRepresentativeChunks } from '../utils/embeddings';

// ======== DEEP KNOWLEDGE BASE ========
const jobDB: Record<string, {
  skills: string[]; tech: string[]; interview: string[]; expectations: string[];
  roadmap: { title: string; goals: string[]; projects: string[]; resources: string[] }[];
}> = {
  'software engineer': {
    skills: ['Data Structures & Algorithms', 'System Design', 'Object-Oriented Programming', 'API Design (REST/GraphQL)', 'Testing & TDD', 'Version Control (Git)', 'CI/CD Pipelines', 'Database Design', 'Code Review', 'Performance Optimization'],
    tech: ['JavaScript/TypeScript', 'Python', 'React/Next.js', 'Node.js/Express', 'SQL (PostgreSQL)', 'NoSQL (MongoDB)', 'Docker', 'AWS/GCP', 'Redis', 'Kubernetes'],
    interview: ['Arrays & Strings manipulation', 'Linked Lists & Trees traversal', 'Dynamic Programming patterns', 'Graph algorithms (BFS/DFS)', 'System Design: URL Shortener', 'System Design: Chat Application', 'REST API design principles', 'Database normalization', 'Concurrency & multithreading', 'Design Patterns (Singleton, Observer, Factory)'],
    expectations: ['Write clean, maintainable, well-tested code', 'Collaborate in Agile/Scrum teams', 'Conduct thorough code reviews', 'Debug and optimize production systems', 'Communicate technical concepts clearly'],
    roadmap: [
      { title: 'Programming Fundamentals & DSA Basics', goals: ['Master arrays, strings, hashmaps', 'Learn Big-O complexity analysis', 'Solve 50+ easy LeetCode problems'], projects: ['Build a CLI task manager', 'Implement common data structures from scratch'], resources: ['NeetCode.io roadmap', 'freeCodeCamp DSA course', 'LeetCode Easy problems'] },
      { title: 'Advanced Algorithms & OOP', goals: ['Trees, graphs, dynamic programming', 'SOLID principles & design patterns', 'Solve 50+ medium LeetCode problems'], projects: ['Build a graph visualizer', 'Design a library management system using OOP'], resources: ['Abdul Bari Algorithms (YouTube)', 'Refactoring Guru design patterns', 'LeetCode Medium problems'] },
      { title: 'Backend Development & Databases', goals: ['Build REST APIs with Node.js/Express', 'Master SQL queries & joins', 'Learn MongoDB & Redis caching'], projects: ['Build a full REST API with auth (JWT)', 'Create a blog platform with comments & search'], resources: ['The Odin Project - NodeJS', 'SQLBolt.com', 'MongoDB University free courses'] },
      { title: 'Frontend & Full-Stack Integration', goals: ['React with hooks & state management', 'TypeScript for type safety', 'Connect frontend to your APIs'], projects: ['Build a full-stack e-commerce app', 'Create a real-time dashboard with WebSockets'], resources: ['React.dev official tutorial', 'TypeScript Handbook', 'Full Stack Open (Helsinki University)'] },
      { title: 'System Design & DevOps', goals: ['Learn distributed systems concepts', 'Docker containerization & Kubernetes basics', 'CI/CD with GitHub Actions'], projects: ['Deploy an app on AWS/GCP with Docker', 'Set up monitoring with Prometheus/Grafana'], resources: ['System Design Primer (GitHub)', 'Docker official getting started', 'AWS Free Tier tutorials'] },
      { title: 'Interview Prep & Mock Interviews', goals: ['Solve 2 LeetCode mediums daily', 'Practice system design whiteboarding', 'Do 5+ mock interviews'], projects: ['Prepare a portfolio website', 'Contribute to 2 open-source projects'], resources: ['Pramp.com (free mock interviews)', 'Interviewing.io', 'Glassdoor interview questions for target company'] },
    ]
  },
  'data scientist': {
    skills: ['Statistics & Probability', 'Machine Learning Algorithms', 'Data Wrangling & Cleaning', 'Feature Engineering', 'Model Evaluation & Validation', 'A/B Testing', 'Data Visualization', 'Deep Learning', 'SQL for Analytics', 'Business Storytelling'],
    tech: ['Python (Pandas, NumPy, Scikit-learn)', 'Jupyter Notebook', 'TensorFlow/PyTorch', 'SQL', 'Matplotlib/Seaborn/Plotly', 'Spark', 'Tableau/Power BI', 'Git', 'AWS SageMaker', 'Airflow'],
    interview: ['Explain bias-variance tradeoff', 'When to use L1 vs L2 regularization', 'How does Random Forest work?', 'Explain gradient descent', 'Design an A/B test', 'SQL: Window functions & CTEs', 'How to handle imbalanced datasets', 'Cross-validation strategies', 'Feature importance methods', 'Explain precision vs recall tradeoff'],
    expectations: ['Extract insights from messy real-world data', 'Build and deploy ML models', 'Communicate findings to non-technical stakeholders', 'Design experiments (A/B tests)', 'Collaborate with engineering teams'],
    roadmap: [
      { title: 'Python & Statistics Foundations', goals: ['Master Python, Pandas, NumPy', 'Learn descriptive & inferential statistics', 'Probability distributions & hypothesis testing'], projects: ['Analyze a Kaggle dataset end-to-end', 'Build an EDA dashboard'], resources: ['Khan Academy Statistics', 'Python for Data Analysis (book)', 'Kaggle Learn courses'] },
      { title: 'Machine Learning Fundamentals', goals: ['Regression, Classification, Clustering', 'Model evaluation (ROC, F1, CV)', 'Feature engineering techniques'], projects: ['Predict house prices (Kaggle)', 'Customer segmentation project'], resources: ['Andrew Ng ML course (Coursera)', 'Scikit-learn documentation', 'Kaggle competitions'] },
      { title: 'Deep Learning & NLP', goals: ['Neural networks & backpropagation', 'CNNs for images, RNNs for sequences', 'Transformers & attention mechanism'], projects: ['Image classifier with CNN', 'Sentiment analysis with transformers'], resources: ['Fast.ai courses (free)', 'Hugging Face tutorials', 'Deep Learning Specialization (Coursera)'] },
      { title: 'SQL, Big Data & Pipelines', goals: ['Advanced SQL (window functions, CTEs)', 'Spark for large-scale data', 'Build data pipelines with Airflow'], projects: ['Build an ETL pipeline', 'Analyze 1M+ row dataset with Spark'], resources: ['Mode Analytics SQL tutorial', 'Databricks free courses', 'Apache Airflow documentation'] },
      { title: 'Model Deployment & MLOps', goals: ['Deploy models with Flask/FastAPI', 'Model monitoring & retraining', 'Docker for ML applications'], projects: ['Deploy ML model as REST API', 'Build a model monitoring dashboard'], resources: ['MLflow documentation', 'Docker for Data Science', 'AWS SageMaker tutorials'] },
      { title: 'Portfolio & Interview Prep', goals: ['Build 3-5 strong portfolio projects', 'Practice case studies & SQL', 'Mock data science interviews'], projects: ['End-to-end ML project on GitHub', 'Data storytelling blog post'], resources: ['Ace the Data Science Interview (book)', 'StrataScratch (SQL practice)', 'Interview Query'] },
    ]
  },
  'default': {
    skills: ['Problem Solving', 'Communication', 'Technical Writing', 'Project Management', 'Critical Thinking', 'Adaptability', 'Teamwork', 'Time Management'],
    tech: ['Google Suite', 'Microsoft Office', 'Git/GitHub', 'Slack', 'SQL basics', 'Python basics', 'Cloud fundamentals', 'Notion/Jira'],
    interview: ['Tell me about yourself', 'Describe a challenging project', 'How do you handle disagreements?', 'Where do you see yourself in 5 years?', 'What are your strengths?', 'Describe a time you failed and learned'],
    expectations: ['Continuous learning mindset', 'Strong communication', 'Team collaboration', 'Initiative & ownership'],
    roadmap: [
      { title: 'Core Skills Assessment', goals: ['Identify current strengths', 'Map gaps to target role', 'Create study schedule'], projects: ['Skills self-assessment document', 'Learning plan spreadsheet'], resources: ['LinkedIn Learning', 'Coursera free courses', 'YouTube tutorials'] },
      { title: 'Technical Foundations', goals: ['Learn role-specific tools', 'Build basic projects', 'Get comfortable with Git'], projects: ['First project in target domain', 'GitHub profile setup'], resources: ['freeCodeCamp', 'The Odin Project', 'Official documentation'] },
      { title: 'Intermediate Skills', goals: ['Deepen technical knowledge', 'Work on complex projects', 'Start networking'], projects: ['Intermediate project', 'Open source contribution'], resources: ['Udemy courses', 'Dev.to articles', 'Tech meetups'] },
      { title: 'Advanced Practice', goals: ['Build production-quality projects', 'Practice interview questions', 'Get feedback from mentors'], projects: ['Portfolio project', 'Case study writeup'], resources: ['Pramp mock interviews', 'Glassdoor reviews', 'Industry blogs'] },
      { title: 'Portfolio & Networking', goals: ['Polish portfolio website', 'Connect with 20+ professionals', 'Attend 3+ industry events'], projects: ['Portfolio website', 'Technical blog posts'], resources: ['LinkedIn networking', 'Twitter tech community', 'Local meetups'] },
      { title: 'Interview Sprint', goals: ['Apply to 10+ positions', 'Do 5+ mock interviews', 'Refine pitch & stories'], projects: ['Application tracker', 'STAR stories document'], resources: ['Company career pages', 'Levels.fyi for comp data', 'Blind app for insights'] },
    ]
  },
};

// Add more job aliases
const jobAliases: Record<string, string> = {
  'swe': 'software engineer', 'sde': 'software engineer', 'developer': 'software engineer', 'programmer': 'software engineer', 'coder': 'software engineer',
  'web developer': 'software engineer', 'full stack': 'software engineer', 'fullstack': 'software engineer',
  'frontend': 'software engineer', 'front end': 'software engineer', 'backend': 'software engineer', 'back end': 'software engineer',
  'data analyst': 'data scientist', 'ml engineer': 'data scientist', 'machine learning': 'data scientist', 'ai engineer': 'data scientist',
  'devops': 'software engineer', 'cloud engineer': 'software engineer', 'site reliability': 'software engineer',
};

const getJobInfo = (dreamJob: string) => {
  const lower = dreamJob.toLowerCase();
  const directKey = Object.keys(jobDB).find(k => lower.includes(k));
  if (directKey) return jobDB[directKey];
  const aliasKey = Object.keys(jobAliases).find(k => lower.includes(k));
  if (aliasKey) return jobDB[jobAliases[aliasKey]];
  return jobDB['default'];
};

// ======== SERVICE FUNCTIONS ========

const getNeurodivergentAnalysisInstructions = (ndType: string): string => {
  if (ndType === 'adhd') {
    return `\nCRITICAL: The student has ADHD. Adapt the career expectations and interview prep recommendations specifically for neuro-inclusive success:
- Under "industryExpectations": emphasize/suggest roles that align with their hyper-focus capabilities (e.g., rapid prototyping, iterative visual development, high-intensity sprints, exploratory analysis) and include expectations/practices from specific neuro-inclusive companies (like Microsoft, SAP, JPMorgan Chase, DXC Technology, Salesforce).
- Under "interviewTopics": recommend portfolio-based interviews, mock sprint task assessments, live coding showcases, or interactive build sessions instead of traditional high-stress abstract whiteboard algorithms.`;
  }
  if (ndType === 'autism') {
    return `\nCRITICAL: The student is Autistic. Adapt the career expectations and interview prep recommendations specifically for neuro-inclusive success:
- Under "industryExpectations": emphasize/suggest roles that align with their deep expertise and pattern recognition capabilities (e.g., test automation, performance tuning, data pipelines, backend architecture) and include expectations/practices from specific neuro-inclusive companies (like Microsoft, SAP, EY, Salesforce).
- Under "interviewTopics": recommend take-home assignments, portfolio walkthroughs, or work-trial days instead of standard high-stress whiteboard algorithm quizzes or intense unstructured conversational panels.`;
  }
  if (ndType === 'dyslexia') {
    return `\nCRITICAL: The student has Dyslexia. Adapt the career expectations and interview prep recommendations specifically for neuro-inclusive success:
- Under "industryExpectations": suggest roles leveraging visual architecture mapping, design-first development, or practical troubleshooting, and highlight companies known for excellent digital accessibility tooling.
- Under "interviewTopics": recommend oral project presentations, verbal logic evaluations, and portfolio review sessions instead of timed coding text file tasks or heavy reading-based exams.`;
  }
  return '';
};

export const analyzeCareer = async (userId: string, dreamJob: string, company: string, userSkills: string[]) => {
  const info = getJobInfo(dreamJob);
  const user = await User.findById(userId);
  const ndType = user?.neurodivergentType || 'none';
  const ndPrompt = getNeurodivergentAnalysisInstructions(ndType);

  const analysis = await askAI<{ requiredSkills: string[]; industryExpectations: string[]; interviewTopics: string[]; techStack: string[] }>(
    `Analyze the specific career requirements for the role of "${dreamJob}" at "${company}".
The student currently knows: ${userSkills.join(', ') || 'Nothing yet — they are a beginner'}.
Based on real job postings and industry standards, return a JSON object:
{
  "requiredSkills": ["list 10 specific skills needed for this exact role"],
  "industryExpectations": ["list 5 things ${company} specifically looks for"],
  "interviewTopics": ["list 10 specific technical interview topics for ${company}"],
  "techStack": ["list 10 specific technologies used at ${company} for this role"]
}
${ndPrompt}`,
    () => ({ requiredSkills: info.skills, industryExpectations: info.expectations, interviewTopics: info.interview, techStack: info.tech })
  );
  return CareerPath.create({ userId: new Types.ObjectId(userId), dreamJob, company, parsedSyllabus: { concepts: [], chapters: [], prerequisites: [], domain: dreamJob }, ...analysis });
};

export const uploadAndAnalyzeSyllabus = async (userId: string, filePath: string, dreamJob: string, company: string) => {
  let text = '';
  try {
    text = (await pdfParse(fs.readFileSync(filePath))).text;
  } catch (err: any) {
    console.error('[CareerService] Failed to parse syllabus PDF:', err.message || err);
  }

  // Upload to Cloudinary for reference storage
  let pdfUrl = '';
  let pdfPublicId = '';
  try {
    const uploadRes = await uploadToCloudinary(filePath, 'nexora_syllabi');
    pdfUrl = uploadRes.url;
    pdfPublicId = uploadRes.publicId;
  } catch (err) {
    console.warn('Failed to upload syllabus PDF to Cloudinary:', err);
  }

  // Delete local temp file
  try {
    fs.unlinkSync(filePath);
  } catch {}

  // Chunking and Embeddings pipeline
  const chunks = sliceTextIntoChunks(text, 1000, 200);
  const syllabusChunks = [];
  for (const chunk of chunks) {
    const embedding = await getEmbedding(chunk);
    syllabusChunks.push({ text: chunk, embedding });
  }

  // Sample representative chunks to avoid context window size issues
  const repChunks = getRepresentativeChunks(chunks, 8);
  const contextText = repChunks.join('\n\n') || text.substring(0, 4000);

  const concepts = text
    .split(/[.\n]/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 100)
    .slice(0, 20);

  const info = getJobInfo(dreamJob);
  const user = await User.findById(userId);
  const ndType = user?.neurodivergentType || 'none';
  const ndPrompt = getNeurodivergentAnalysisInstructions(ndType);

  const result = await askAI<{ requiredSkills: string[]; industryExpectations: string[]; interviewTopics: string[]; techStack: string[] }>(
    `Given this syllabus content context: "${contextText}" and target role "${dreamJob}" at "${company}", analyze what skills are needed.
Based on real job postings and industry standards, return JSON:
{
  "requiredSkills": ["list 10 specific skills needed"],
  "industryExpectations": ["list 5 specific expectations"],
  "interviewTopics": ["list 10 specific interview topics"],
  "techStack": ["list 10 specific technologies"]
}
${ndPrompt}`,
    () => ({ requiredSkills: info.skills, industryExpectations: info.expectations, interviewTopics: info.interview, techStack: info.tech })
  );

  return CareerPath.create({
    userId: new Types.ObjectId(userId),
    dreamJob,
    company,
    parsedSyllabus: { concepts, chapters: concepts.slice(0, 10), prerequisites: [], domain: dreamJob },
    pdfUrl,
    pdfPublicId,
    syllabusChunks,
    ...result
  });
};

export const getGapAnalysis = async (userId: string, careerPathId: string) => {
  const cp = await CareerPath.findOne({ _id: careerPathId, userId });
  const user = await User.findById(userId);
  if (!cp || !user) throw new Error('Career path not found');
  const userSkills = (user.skills || []).map(s => s.toLowerCase());
  const required = cp.requiredSkills || [];
  const matched = required.filter(s => userSkills.some(us => us.includes(s.toLowerCase()) || s.toLowerCase().includes(us)));
  const missing = required.filter(s => !matched.includes(s));

  const analysis = await askAI<{ matchedSkills: string[]; missingSkills: { skill: string; priority: string; difficulty: string; timeEstimate: string }[]; overallMatch: number }>(
    `A student wants to become "${cp.dreamJob}" at "${cp.company}".
They know: [${user.skills.join(', ') || 'nothing yet'}].
The role requires: [${required.join(', ')}].
Analyze the gap. Return JSON:
{
  "matchedSkills": ["skills they already have that match"],
  "missingSkills": [{"skill":"name","priority":"high|medium|low","difficulty":"easy|medium|hard","timeEstimate":"realistic time like 2-4 weeks"}],
  "overallMatch": percentage_number
}
Be realistic — partial matches count. Order missingSkills by priority (highest first).`,
    () => ({
      matchedSkills: matched,
      missingSkills: missing.map((skill, i) => ({
        skill, priority: i < missing.length / 3 ? 'high' : i < (missing.length * 2) / 3 ? 'medium' : 'low',
        difficulty: i % 3 === 0 ? 'hard' : i % 3 === 1 ? 'medium' : 'easy',
        timeEstimate: i < 3 ? '3-4 weeks' : i < 6 ? '2-3 weeks' : '1-2 weeks',
      })),
      overallMatch: required.length > 0 ? Math.round((matched.length / required.length) * 100) : 0,
    })
  );
  return CareerMatch.findOneAndUpdate({ userId: new Types.ObjectId(userId), careerPathId: new Types.ObjectId(careerPathId) }, analysis, { upsert: true, new: true });
};

export const generateRoadmap = async (userId: string, careerPathId: string, duration = 6) => {
  const cp = await CareerPath.findById(careerPathId);
  const user = await User.findById(userId);
  if (!cp || !user) throw new Error('Career path not found');
  const gap = await CareerMatch.findOne({ userId: new Types.ObjectId(userId), careerPathId: new Types.ObjectId(careerPathId) });
  const missingSkills = gap?.missingSkills.map(s => s.skill) || cp.requiredSkills;
  const info = getJobInfo(cp.dreamJob);

  let neurodivergentPrompt = '';
  if (user.neurodivergentType === 'adhd') {
    neurodivergentPrompt = `CRITICAL: The user has ADHD. Tailor the roadmap to highlight neuro-inclusive companies, suggest roles aligning with hyper-focus capabilities, recommend portfolio-based interviews over standard whiteboard algorithms, and keep weekly goals short, highly engaging, and structured around small wins.`;
  } else if (user.neurodivergentType === 'autism') {
    neurodivergentPrompt = `CRITICAL: The user is Autistic. Tailor the roadmap to highlight neuro-inclusive companies, suggest roles requiring deep expertise and pattern recognition, recommend portfolio-based interviews or take-home assignments, and ensure all goals are highly structured, predictable, and explicit.`;
  } else if (user.neurodivergentType === 'dyslexia') {
    neurodivergentPrompt = `CRITICAL: The user has Dyslexia. Recommend companies with strong accessibility tooling, suggest practical/visual project-based learning rather than heavy reading, and recommend portfolio-based or oral interviews where possible.`;
  }

  const data = await askAI<{ months: { month: number; title: string; goals: string[]; skills: string[]; projects: string[]; resources: string[]; milestones: string[] }[]; interviewQuestions: string[] }>(
    `Create a detailed, realistic ${duration}-month career roadmap for someone who wants to become a "${cp.dreamJob}" at "${cp.company}".
They need to learn: ${missingSkills.join(', ')}.
Tech stack to master: ${cp.techStack.join(', ')}.
${neurodivergentPrompt}

Return JSON:
{
  "months": [
    {
      "month": 1,
      "title": "descriptive title for this month",
      "goals": ["3-4 specific, measurable weekly goals"],
      "skills": ["skills to learn this month"],
      "projects": ["2 specific hands-on project ideas with descriptions"],
      "resources": ["3-4 specific free resources — real URLs or course names"],
      "milestones": ["2 concrete checkpoints to verify progress"]
    }
  ],
  "interviewQuestions": ["10 specific interview questions for ${cp.dreamJob} at ${cp.company}"]
}
Make EXACTLY ${duration} months. Be specific — no generic advice. Each month should build on the previous.`,
    () => {
      const rm = info.roadmap || jobDB['default'].roadmap;
      return {
        months: Array.from({ length: duration }, (_, i) => {
          const src = rm[i % rm.length];
          const monthSkills = missingSkills.slice(i * Math.ceil(missingSkills.length / duration), (i + 1) * Math.ceil(missingSkills.length / duration));
          return {
            month: i + 1,
            title: src.title,
            goals: src.goals,
            skills: monthSkills.length > 0 ? monthSkills : [src.title],
            projects: src.projects,
            resources: src.resources,
            milestones: [`Complete ${monthSkills[0] || src.title} module`, `Build project #${i + 1}`, `Pass self-assessment quiz`],
          };
        }),
        interviewQuestions: info.interview.map(t => `Explain ${t} with a real-world example`),
      };
    }
  );
  return Roadmap.create({ userId: new Types.ObjectId(userId), careerPathId: new Types.ObjectId(careerPathId), duration, ...data });
};

export const getIndustryInsights = async (dreamJob: string, company: string) => {
  return askAI(
    `Provide current industry insights for "${dreamJob}" at "${company}". Return JSON: { "salaryRange":"", "growthOutlook":"", "topCompanies":[], "emergingTrends":[], "certifications":[], "communityResources":[] }`,
    () => ({
      salaryRange: '$80,000 - $180,000 (varies by location & experience)',
      growthOutlook: 'Strong demand expected through 2030 with 15-25% industry growth.',
      topCompanies: [company, 'Google', 'Microsoft', 'Amazon', 'Meta', 'Apple', 'Netflix'],
      emergingTrends: ['AI/ML Integration', 'Cloud-Native Architecture', 'Edge Computing', 'Green Tech'],
      certifications: ['AWS Solutions Architect', 'Google Cloud Professional', 'Meta Certified Developer'],
      communityResources: ['Stack Overflow', 'GitHub', 'Dev.to', 'Hacker News', 'Tech Twitter'],
    })
  );
};
