# Pivot

**AI-powered career operations platform that automates your entire job search workflow.**

Pivot combines ATS analysis, AI-generated documents, application tracking, and productivity tools into a single app — so you spend less time on admin and more time landing offers.

---

## How Pivot Helps Your Job Search

Job hunting is a full-time job in itself. Pivot automates the repetitive parts:

| Without Pivot | With Pivot |
|---|---|
| Manually tailor your CV for each application | AI rewrites your CV to match each job description |
| Copy-paste JDs into multiple tools | Paste a URL — Pivot extracts everything automatically |
| Wonder if your CV passes ATS filters | Get an exact ATS compatibility score with skill gap analysis |
| Lose track of where you applied | Full application tracker with status pipeline |
| Scramble to prepare for interviews | Calendar with reminders, quick presets, and focus mode |
| Start cover letters from scratch | AI generates personalized cover letters in seconds |

**The result:** You apply to more jobs, with better-tailored documents, in less time.

---

## Screenshots

| Job Analyzer | Application Tracker |
|:---:|:---:|
| ![Job Analyzer](Job%20Analyzer.png) | ![Saved Jobs](Saved%20Jobs.png) |

| CV Builder | Documents |
|:---:|:---:|
| ![CV Builder](CV%20Builder.png) | ![Documents](Documnets.png) |

| Calendar | AI Chat Assistant |
|:---:|:---:|
| ![Calendar](Calendar.png) | ![Ask Bro](Ask%20Bro.png) |

---

## Features

### Job Analyzer — Beat the Bots
- Paste a job posting URL or text — AI extracts requirements, experience level, and keywords
- Upload your resume or select from saved profiles
- Get a detailed **ATS compatibility score** with breakdown: Skills, Experience, Education, Keywords
- See exactly which skills match, which are partial, and which are missing
- AI generates a **tailored CV and cover letter** optimized for that specific job
- Compare multiple resume profiles to find the best fit
- Supports English and German

### CV Builder — Professional Resumes, Fast
- 4 template layouts: Classic, Sidebar, Accent Banner, Executive
- 10 color schemes, 6 fonts, adjustable size/spacing/margins
- Live A4 preview with real-time editing
- Sections: Personal Info, Summary, Experience, Skills, Education, Projects, Certifications, Languages
- Auto-save as you type, multi-CV management
- Export to PDF with one click

### Application Tracker — Never Lose Track
- Kanban-style status pipeline: Draft → Applied → Interview → Offer → Rejected
- AI auto-extracts company, role, and job description from URLs
- Generate tailored CVs and cover letters per application
- Download generated documents directly from the tracker

### Documents — Your Resume Library
- Create, import, edit, and organize resume documents
- AI-powered CV generation wizard: select a base CV, enter job details, get a tailored version
- Search, filter by category/type/date, list or grid view
- Preview and download as PDF

### Calendar — Stay on Schedule
- Monthly calendar with event dots and day details
- Event types: Interview, Deadline, Networking, Preparation
- Quick presets: Phone Screen, Tech Interview, Deadline, Prep Session
- Upcoming agenda sidebar with navigation

### AI Chat Assistant — Career Coach on Demand
- Ask anything about your job search, interviews, salary negotiation, or career pivots
- Markdown-rendered responses with conversation history

### Focus Player — Productivity Mode
- 4 curated playlists (Spotify + YouTube integration)
- Built-in Pomodoro timer (25 min work / 5 min break)
- Audio notification when sessions complete

### In-App Browser
- Browse LinkedIn, Indeed, and other job sites without leaving the app
- Proxied iframe to avoid CORS issues
- Smart URL handling — paste a search term or full URL

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS |
| Backend | Express.js, Vite |
| Database | LocalStorage (browser-based, no server needed) |
| AI | Google Gemini API |
| PDF | React PDF, jsPDF, html2canvas |
| Build | Vite + esbuild |

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Google Gemini API key (free at [aistudio.google.com/apikey](https://aistudio.google.com/apikey))

### 1. Clone the repo
```bash
git clone https://github.com/syedamirkafi/pivot.git
cd pivot
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set your API key
Create a `.env` file:
```env
GEMINI_API_KEY=your-api-key-here
```

### 4. Run
```bash
npm run dev
```

Open **http://localhost:3000** — that's it. No accounts, no Firebase, no cloud setup.

---

## Project Structure

```
pivot/
├── server.ts              # Express backend (AI endpoints, rate limiting, SSRF protection)
├── src/
│   ├── App.tsx            # Routing and app entry
│   ├── firebase.ts        # Database layer (localStorage-based)
│   ├── localDb.ts         # Firestore-compatible localStorage API
│   ├── types.ts           # TypeScript interfaces
│   ├── components/        # Shared UI components
│   │   ├── Layout.tsx     # App shell with sidebar navigation
│   │   ├── ResumePDF.tsx  # PDF generation component
│   │   └── ResumeEditor.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx      # Stats overview
│   │   ├── JobAnalyzer.tsx    # ATS scoring + document generation
│   │   ├── JobTracker.tsx     # Application tracker
│   │   ├── Builder.tsx        # CV/resume editor
│   │   ├── Documents.tsx      # Document management
│   │   ├── Calendar.tsx       # Scheduling
│   │   ├── ChatAssistant.tsx  # AI career coach
│   │   ├── Browser.tsx        # In-app web browser
│   │   └── FocusPlayer.tsx    # Music + Pomodoro timer
│   └── data/
│       └── masterCV.ts    # Default CV seed data
├── public/
│   └── chrome-extension/  # Companion Chrome extension
├── firestore.rules        # Firestore security rules (for cloud mode)
└── package.json
```

---

## Security

- **Rate limiting** on all API endpoints (100 req/min global, 10 req/min for AI)
- **SSRF protection** with DNS resolution and private IP blocking on URL fetch
- **Header allowlist** on proxy endpoint (no sensitive header forwarding)

---

## License

MIT
