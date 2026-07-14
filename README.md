# Pivot

AI-powered career operations platform that automates job application workflows — from JD analysis to tailored document generation.

## Features

- **Job Description Analyzer** — Paste a URL or text to extract requirements, calculate ATS compatibility scores, and identify skill gaps
- **Multi-Resume Management** — Save multiple CV versions and compare them side-by-side against job requirements
- **Tailored Document Generation** — Generate ATS-optimized CVs and cover letters using Google Gemini AI
- **Application Tracker** — Track job applications with status management (Draft → Applied → Interview → Offer)
- **Dashboard** — Overview of application stats and recent activity
- **Document Management** — Store and manage generated documents

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend:** Express.js
- **Database:** Firebase Firestore
- **Authentication:** Firebase Auth (Google Sign-in)
- **AI:** Google Gemini API
- **PDF:** React PDF, jsPDF
- **Build:** Vite

## Setup

### Prerequisites

- Node.js 18+
- Firebase project (Firestore + Auth enabled)
- Google Gemini API key

### Install

```bash
npm install
```

### Configure

1. Copy `.env.example` to `.env.local`
2. Add your Firebase credentials
3. Add your Gemini API key

```env
GEMINI_API_KEY=your-api-key
VITE_FIREBASE_API_KEY=your-firebase-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
```

### Run

```bash
npm run dev
```

## License

MIT
