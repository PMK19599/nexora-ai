# 🧠 Nexora AI — AI-Powered E-Learning Platform

## ⚡ Quick Start (3 steps)

### Step 1: Install dependencies
```bash
cd nexora-ai
npm run install:all
```

### Step 2: Start MongoDB (REQUIRED — pick one option)

**Option A — Install MongoDB locally (easiest):**
- Download from https://www.mongodb.com/try/download/community
- Install it, then run `mongod` in a terminal
- The default URI `mongodb://127.0.0.1:27017/nexora` will work automatically

**Option B — Docker (if you have Docker):**
```bash
docker run -d -p 27017:27017 --name mongodb mongo:7
```

**Option C — MongoDB Atlas (free cloud):**
1. Go to https://cloud.mongodb.com
2. Create a free cluster → Get connection string
3. Edit `backend/.env` and set:
   ```
   MONGODB_URI=mongodb+srv://youruser:yourpass@cluster.mongodb.net/nexora
   ```

### Step 3: Run the app
```bash
npm run dev
```
- Frontend: http://localhost:5173
- Backend: http://localhost:5000

### Optional: Seed test data
```bash
npm run seed
```

## Test data

Seeded privileged accounts are disabled by default. For local-only administration, set ignored `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` values before running the seeder. Never reuse these values in production.

## 🔧 Troubleshooting

### "ECONNREFUSED" or "status code 500"
→ MongoDB is not running. Start it with `mongod` or use Atlas.

### "Cannot reach the server"
→ Backend is not running. Open a terminal and run `cd backend && npm run dev`

### Registration fails
→ Check the terminal where backend runs for error messages. Usually it's a MongoDB issue.

## 📦 Tech Stack
- **Frontend:** React 19, Vite, TypeScript, TailwindCSS, ShadCN UI, Zustand, React Query
- **Backend:** Node.js, Express, TypeScript, Socket.io, JWT, Mongoose
- **Database:** MongoDB
- **AI:** Anthropic Claude API (optional)

Vercel Git connection test.
