# Nexora AI

[![CI/CD](https://github.com/PMK19599/nexora-ai/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/PMK19599/nexora-ai/actions/workflows/ci.yml)

> **Live Demo:** [https://frontend-kappa-fawn-15.vercel.app](https://frontend-kappa-fawn-15.vercel.app)

> **Project status:** Beta Release Ready. The application is deployed, secured, and actively tested.

AI-powered adaptive learning infrastructure designed for students with ADHD, autism and dyslexia.

## Problem

Most learning platforms deliver the same material in the same format, even though neurodivergent learners may require different presentation, pacing and interaction styles.

## Solution

Nexora allows educators to upload learning material and reconstructs it into accessibility-aware learning experiences.

## Key Features

- ADHD-focused content restructuring
- Dyslexia-friendly presentation
- Autism-aware learning flows
- Educator and student dashboards
- Real-time communication
- Accessibility preferences
- AI-assisted material transformation
- Secure authentication

## Architecture & Tech Stack

- **Frontend (Vercel):** React 19, TypeScript, Vite, Tailwind CSS, ShadCN UI, Zustand, React Query
- **Backend (Render):** Node.js, Express, TypeScript, Socket.io
- **Database:** MongoDB with Mongoose
- **Authentication:** JWT with HttpOnly cookies
- **AI Engine:** Groq-powered content transformation

## Screenshots

![Nexora AI landing page](Landing-page.png)

## Security & Validation

- HttpOnly cookie-based JWT authentication
- Strict backend API payload validation boundaries
- Test/seed credentials removed from the repository and configuration centralized through environment variables.
- Protected route enforcement

## Testing & QA

- **Frontend (Vitest):** 34/34 passing
- **Backend (Jest):** 102/102 passing
- **End-to-end validation:** 3/3 validation suites passing across 12 failure constraints.
- **Status:** All critical paths and route protections are verified.

## Local Development

```bash
npm run install:all
npm run dev
```

The frontend runs on `http://localhost:5173` and the backend runs on `http://localhost:5000`.

MongoDB must be running locally or configured through `MONGODB_URI`.

## AI-Assisted Development

AI coding assistants were used for implementation support, debugging, auditing, and remediation. Generated changes were reviewed, tested, and accepted by the team before being merged.

## Known Limitations

- Production deployment and third-party service configuration (e.g., email delivery, AI-providers) depend on valid production credentials.
- Cross-browser, mobile-device, and accessibility testing is an ongoing effort.
- AI-generated learning content should be reviewed by educators before high-stakes use.

## My Contribution

- Product direction and feature planning
- Accessibility-focused workflow design
- Deployment coordination
- QA, audit review, and remediation tracking
- Security and release-readiness improvements

## Team

Nexora AI was developed by Team NEXORA for Hack4Soc 3.0.

- [Purushotham K](https://github.com/PMK19599) — Product direction, accessibility-focused workflows, deployment coordination, QA, and release-readiness improvements
- [Gagan M](https://github.com/Gagan234-M) — Frontend development, interface implementation, and UI integration
- [Jayanth B S](https://github.com/jayanthbs24-star) — Backend development, APIs, database integration, and application logic
