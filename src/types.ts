export interface User {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface JobApplication {
  id?: string;
  company: string;
  role: string;
  status: 'Draft' | 'Applied' | 'Interview' | 'Offer' | 'Rejected';
  dateApplied?: string;
  jobLink?: string;
  jobDescription?: string;
  cvUrl?: string;
  coverLetterUrl?: string;
  generatedCvId?: string;
  generatedCoverLetterId?: string;
  matchScore?: number;
  userId: string;
  createdAt: number;
}

export interface AnalysisResult {
  score: number;
  skillGaps: string[];
  missingKeywords: string[];
  recommendations: string[];
  extractedInfo?: {
    role?: string;
    experience?: string;
    location?: string;
    employmentType?: string;
    industry?: string;
  };
  matchBreakdown?: {
    skills?: number;
    experience?: number;
    education?: number;
    keywords?: number;
    otherFactors?: number;
  };
  skillsList?: Array<{ name: string; status: 'matched' | 'partial' | 'missing' }>;
}

export interface ResumeProfile {
  id?: string;
  name: string;
  content: string;
  type?: 'master' | 'generated' | 'generated_cl';
  jobId?: string;
  userId: string;
  createdAt: number;
}

export interface CVContent {
  personalInfo: {
    fullName: string;
    title: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    github: string;
  };
  summary: string;
  experience: {
    id: string;
    role: string;
    company: string;
    period: string;
    bullets: string[];
  }[];
  skills: string[];
  education: {
    id: string;
    degree: string;
    school: string;
    period: string;
    gpa?: string;
  }[];
  projects: {
    id: string;
    title: string;
    period: string;
    description: string;
  }[];
  certifications: {
    id: string;
    name: string;
    year: string;
  }[];
  languages: {
    id: string;
    name: string;
    level: string;
  }[];
}

export interface CVListItem {
  id: string;
  name: string;
  content: CVContent;
  template?: string;
  color?: string;
  font?: string;
  fontSize?: number;
  spacing?: string;
  margins?: 'Narrow' | 'Normal' | 'Wide';
  showIcons?: boolean;
  showDividers?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export interface CalendarEvent {
  id?: string;
  title: string;
  date: string; // 'yyyy-MM-dd'
  time: string; // 'HH:mm'
  type: 'Interview' | 'Deadline' | 'Networking' | 'Preparation' | 'Other';
  description?: string;
  userId: string;
  createdAt: number;
}
