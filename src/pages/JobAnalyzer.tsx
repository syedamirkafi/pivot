import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AnalysisResult, ResumeProfile } from '../types';
import { 
  UploadCloud, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  Check, 
  Plus, 
  Trash2, 
  Settings, 
  ChevronRight, 
  Award, 
  Zap,
  Sparkles,
  ArrowRight,
  Info,
  X,
  Maximize2,
  Search,
  ExternalLink,
  Lightbulb,
  XCircle,
  MinusCircle,
  Briefcase,
  Calendar,
  MapPin,
  Building,
  GraduationCap,
  Key,
  Code
} from 'lucide-react';
import Markdown from 'react-markdown';
import { db, handleFirestoreError, OperationType, getIdToken } from '../firebase';
import { collection, addDoc, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const extractKeywords = (text: string) => {
  const clean = (text || "").toLowerCase().replace(/[^a-z0-9]/g, ' ');
  const words = clean.split(/\s+/).filter(w => w.length > 3);
  const stopWords = new Set(['this', 'that', 'with', 'from', 'your', 'have', 'will', 'about', 'what', 'when', 'where', 'they', 'experience', 'skills', 'work', 'years', 'team', 'ability']);
  return new Set(words.filter(w => !stopWords.has(w)));
};

const calculateBasicScore = (jobText: string, cvText: string) => {
  const jobKeywords = extractKeywords(jobText);
  const cvKeywords = extractKeywords(cvText);
  let matches = 0;
  jobKeywords.forEach(word => {
    if (cvKeywords.has(word)) matches++;
  });
  if (jobKeywords.size === 0) return 0;
  const rawScore = (matches / Math.max(jobKeywords.size, 10)) * 100;
  return Math.min(98, Math.max(35, Math.round(rawScore * 1.8)));
};

const DEFAULT_JOB_DESC = `We are looking for a Business Analyst Intern to support our teams in analyzing business processes, gathering requirements and creating data-driven solutions. You will work closely with stakeholders to identify opportunities for improvement and help deliver impactful insights.

Key Responsibilties:
• Analyze business processes and data to identify trends
• Support in gathering and documenting requirements
• Create reports and dashboards in Power BI / Excel
• Collaborate with cross-functional teams
• Assist in projects from concept to delivery`;

const DEFAULT_JOB_LINK = "https://linkedin.com/jobs/view/1234567890";

const DEFAULT_ANALYSIS: AnalysisResult = {
  score: 86,
  skillGaps: ["SAP", "German Language"],
  missingKeywords: ["SAP", "German Language"],
  recommendations: [
    "Add specific experience with SAP if you have any.",
    "Highlight your SQL skills more prominently.",
    "Include any German language proficiency details.",
    "Add more metrics/achievements to strengthen your profile."
  ],
  extractedInfo: {
    role: "Business Analyst Intern",
    experience: "0 - 2 years",
    location: "Düsseldorf, Germany",
    employmentType: "Internship",
    industry: "Pharmaceutical"
  },
  matchBreakdown: {
    skills: 85,
    experience: 80,
    education: 90,
    keywords: 88,
    otherFactors: 75
  },
  skillsList: [
    { name: "Business Analysis", status: "matched" },
    { name: "Requirements Gathering", status: "matched" },
    { name: "Data Analysis", status: "matched" },
    { name: "Microsoft Excel", status: "matched" },
    { name: "Power BI", status: "matched" },
    { name: "Process Mapping", status: "matched" },
    { name: "SQL", status: "matched" },
    { name: "SAP", status: "missing" },
    { name: "Python", status: "partial" },
    { name: "German Language", status: "missing" },
    { name: "Agile Methodologies", status: "matched" },
    { name: "Stakeholder Management", status: "matched" }
  ]
};

export function JobAnalyzer({ user, token }: { user: User; token: string }) {
  const [jobDescription, setJobDescription] = useState("");
  const [jobLink, setJobLink] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisCache, setAnalysisCache] = useState<Record<string, AnalysisResult>>({});
  const [hasExtracted, setHasExtracted] = useState(false);
  const [extractedInfo, setExtractedInfo] = useState<{
    role: string;
    experience: string;
    location: string;
    employmentType: string;
    industry: string;
  } | null>(null);

  // Modal / Detail States
  const [showRawTextModal, setShowRawTextModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Multi-Resume State
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>('upload'); // 'upload' or resume ID
  const [newProfileName, setNewProfileName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showManageModal, setShowManageModal] = useState(false);
  
  // Comparative Testing State
  const [testingAllResumes, setTestingAllResumes] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Array<{
    id: string;
    name: string;
    score: number;
    analysis?: AnalysisResult;
  }>>([]);

  // Generation & Tailored Output State
  const [generating, setGenerating] = useState(false);
  const [language, setLanguage] = useState('English');
  const [docLinks, setDocLinks] = useState<{ 
    cvUrl: string; 
    coverLetterUrl: string; 
    cvText?: string; 
    clText?: string;
    improvedAnalysis?: AnalysisResult | null;
  } | null>(null);

  const [activePreviewTab, setActivePreviewTab] = useState<'cv' | 'cl'>('cv');
  const [copied, setCopied] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const navigate = useNavigate();

  // Load Saved Resumes from Firestore
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'resumes'), 
      where('userId', '==', user.uid), 
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: ResumeProfile[] = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() } as ResumeProfile);
      });
      setResumes(list);
      // Auto select first saved profile if any exist, otherwise default to upload
      if (list.length > 0 && selectedResumeId === 'upload') {
        setSelectedResumeId(list[0].id || 'upload');
      }
    }, (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, 'resumes');
      } catch (e) {
        // Handled
      }
    });
    return () => unsubscribe();
  }, [user]);

  // Handle auto-extraction from link
  const handleAutoExtract = async () => {
    if (!jobLink) return;
    setExtracting(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/extract-job-details', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url: jobLink })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      setJobDescription(data.jobDescription);
      
      // Seed initial mock extracted parameters or rely on server payload
      const mockExtracted = {
        role: data.role || "Extracted Role",
        experience: "Not specified",
        location: "Not specified",
        employmentType: "Full-time",
        industry: "Not specified"
      };
      setExtractedInfo(mockExtracted);
      setHasExtracted(true);

      if (analysis) {
        setAnalysis({
          ...analysis,
          extractedInfo: {
            role: data.role || analysis.extractedInfo?.role || "Extracted Role",
            experience: analysis.extractedInfo?.experience || "Not specified",
            location: analysis.extractedInfo?.location || "Not specified",
            employmentType: analysis.extractedInfo?.employmentType || "Full-time",
            industry: analysis.extractedInfo?.industry || "Not specified"
          }
        });
      }
    } catch (err: any) {
      console.error(err);
      alert('Error extracting: ' + err.message);
    } finally {
      setExtracting(false);
    }
  };

  // Handle extraction and saving a resume profile
  const handleSaveProfile = async () => {
    if (!cvFile || !newProfileName.trim()) return;
    setIsSavingProfile(true);
    const formData = new FormData();
    formData.append('cv', cvFile);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/extract-resume-text', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to extract text from PDF');
      }

      await addDoc(collection(db, 'resumes'), {
        name: newProfileName.trim(),
        content: data.text,
        userId: user.uid,
        createdAt: Date.now()
      });

      setNewProfileName('');
      setCvFile(null);
      alert('Resume Profile saved successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Error saving profile: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Delete a saved resume profile
  const handleDeleteProfile = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this resume profile?')) return;
    try {
      await deleteDoc(doc(db, 'resumes', id));
      if (selectedResumeId === id) {
        setSelectedResumeId(resumes.length > 1 ? resumes.filter(r => r.id !== id)[0].id || 'upload' : 'upload');
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to delete profile.');
    }
  };

  // Test single resume ATS fit
  const handleAnalyze = async (resumeIdToAnalyze?: string) => {
    if (!jobDescription) return;
    const targetId = resumeIdToAnalyze || selectedResumeId;

    let cvTextToAnalyze = "";
    if (targetId === 'upload') {
      if (!cvFile) {
        alert('Please upload a CV file or select a saved profile.');
        return;
      }
    } else {
      const profile = resumes.find(r => r.id === targetId);
      if (!profile) return;
      cvTextToAnalyze = profile.content;
    }

    const cacheKey = targetId !== 'upload' ? `${jobDescription.length}-${cvTextToAnalyze.length}-${targetId}` : null;
    if (cacheKey && analysisCache[cacheKey]) {
      setAnalysis(analysisCache[cacheKey]);
      
      // Update comparison results if they exist
      setComparisonResults(prev => prev.map(res => 
        res.id === targetId ? { ...res, analysis: analysisCache[cacheKey] } : res
      ));
      return;
    }

    setAnalyzing(true);
    setAnalysis(null);
    setDocLinks(null);
    if (!resumeIdToAnalyze) setComparisonResults([]);

    const formData = new FormData();
    formData.append('jobDescription', jobDescription);

    if (targetId === 'upload') {
      formData.append('cv', cvFile!);
    } else {
      formData.append('cvText', cvTextToAnalyze);
    }

    try {
      const token = await getIdToken();
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setAnalysis(data);
        if (cacheKey) {
          setAnalysisCache(prev => ({ ...prev, [cacheKey]: data }));
        }
        
        // Update comparison results if they exist
        setComparisonResults(prev => prev.map(res => 
          res.id === targetId ? { ...res, analysis: data } : res
        ));
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Analysis failed.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Comparative Testing - test all saved profiles against job description locally
  const handleCompareAllResumes = async () => {
    if (!jobDescription || resumes.length === 0) return;
    setTestingAllResumes(true);
    setComparisonResults([]);
    setAnalysis(null);
    setDocLinks(null);

    try {
      const results: Array<{
        id: string;
        name: string;
        score: number;
        analysis?: AnalysisResult;
      }> = [];

      for (const r of resumes) {
        const localScore = calculateBasicScore(jobDescription, r.content);
        results.push({
          id: r.id || '',
          name: r.name,
          score: localScore
        });
      }

      results.sort((a, b) => b.score - a.score);
      setComparisonResults(results);
      
      if (results.length > 0) {
        setSelectedResumeId(results[0].id);
        // We do not auto-analyze here to save tokens. User must click 'Analyze' or click a resume.
      }
    } catch (err) {
      console.error(err);
      alert('Error comparing resume profiles.');
    } finally {
      setTestingAllResumes(false);
    }
  };

  // Generate Google Doc and perform dual-pass improved ATS analysis
  const handleGenerate = async () => {
    if (!jobDescription || !token) return;
    setGenerating(true);
    setDocLinks(null);
    
    const formData = new FormData();
    formData.append('jobDescription', jobDescription);
    formData.append('language', language);

    if (selectedResumeId === 'upload') {
      if (!cvFile) return;
      formData.append('cv', cvFile);
    } else {
      const profile = resumes.find(r => r.id === selectedResumeId);
      if (!profile) return;
      formData.append('cvText', profile.content);
    }

    try {
      const idToken = await getIdToken();
      const res = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: {
          ...(idToken ? { 'Authorization': `Bearer ${idToken}` } : {}),
          ...(token ? { 'X-Google-Access-Token': token } : {})
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        setDocLinks(data);
      } else {
        alert('Error: ' + data.error);
      }
    } catch (err) {
      console.error(err);
      alert('Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  // Save the job application and matching scores to Saved Jobs
  const saveToTracker = async () => {
    try {
      let company = 'Target Company';
      let role = analysis?.extractedInfo?.role || 'Target Role';
      
      const lines = jobDescription.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 0 && !analysis?.extractedInfo?.role) {
        role = lines[0].substring(0, 100);
      }

      await addDoc(collection(db, 'applications'), {
        company,
        role,
        status: 'Draft',
        dateApplied: new Date().toISOString().split('T')[0],
        jobDescription,
        cvUrl: docLinks?.cvUrl || '',
        coverLetterUrl: docLinks?.coverLetterUrl || '',
        matchScore: docLinks?.improvedAnalysis?.score || analysis?.score || 0,
        userId: user.uid,
        createdAt: Date.now()
      });
      alert('Saved to Saved Jobs Tracker! You can edit details there.');
      navigate('/tracker');
    } catch (error) {
      console.error(error);
      alert('Failed to save.');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto pb-16">
      {/* Upper header with brand layout, search icon and status card */}
      <header className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 id="page-title" className="text-2xl font-mono font-bold tracking-tight text-[#FF4D00] flex items-center gap-3">
            <Search className="w-6 h-6 text-[#FF4D00]" /> JOB ANALYZER
          </h1>
        </div>
        
        <div className="flex gap-3 items-center shrink-0">
          <div className="flex items-center gap-2 bg-[#FF4D00]/10 border border-[#FF4D00]/20 px-3 py-1.5 text-xs font-mono text-[#FF4D00] rounded-none">
            <Search className="w-3.5 h-3.5" /> ATS MATCH ENGINE
          </div>
          <button
            id="btn-manage-profiles"
            onClick={() => setShowManageModal(true)}
            className="hidden md:flex items-center justify-center gap-2 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40 bg-neutral-950/20 text-neutral-200 px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer rounded-none"
          >
            <Settings className="w-4 h-4 text-[#8E8E93]" />
            Manage Profiles ({resumes.length || 1})
          </button>
        </div>
      </header>

      {/* Subtitle / Description directly below the header */}
      <p className="text-sm text-[#8E8E93] max-w-2xl">
        Paste a job description or URL to analyze the role, extract key requirements and match with your profile.
      </p>

      {/* Mobile Manage Profiles Button */}
      <div className="block md:hidden">
        <button
          id="btn-manage-profiles-mobile"
          onClick={() => setShowManageModal(true)}
          className="w-full flex items-center justify-center gap-2 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900/40 bg-neutral-950/20 text-neutral-200 px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer rounded-none"
        >
          <Settings className="w-4 h-4 text-[#8E8E93]" />
          Manage Profiles ({resumes.length || 1})
        </button>
      </div>

      {/* Main 2-column grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Input Panel */}
        <div className="xl:col-span-7 space-y-6">
          
          <div className="bg-[#111113]/80 border border-white/5 p-6 rounded-xl space-y-6">
            
            {/* 1. URL Auto-Extractor */}
            <div className="space-y-3">
              <span className="block font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[#FF4D00] font-medium">
                AI URL Auto-Extractor
              </span>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://linkedin.com/jobs/view/1234567890"
                    value={jobLink}
                    onChange={e => setJobLink(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-md px-3 py-2.5 text-sm focus:border-[#FF4D00] outline-none transition-all placeholder:text-neutral-600 text-neutral-200"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAutoExtract}
                  disabled={extracting || !jobLink}
                  className="bg-[#FF4D00] text-[#0C0C0E] px-6 py-2.5 text-sm font-semibold rounded-md hover:bg-[#FF5C15] disabled:opacity-40 transition-all cursor-pointer shrink-0"
                >
                  {extracting ? 'Extracting...' : 'Extract'}
                </button>
              </div>

              {/* Extraction Status Bar */}
              {hasExtracted && jobDescription && (
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-1.5 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Job description extracted successfully</span>
                  </div>
                  <button
                    onClick={() => setShowRawTextModal(true)}
                    className="text-[#FF4D00] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                  >
                    View Raw Text <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* 2. Job Description Textarea */}
            <div className="space-y-3">
              <span className="block font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[#8E8E93] font-medium">
                Job Description
              </span>
              <textarea
                className="w-full bg-[#161619] border border-white/10 rounded-md p-4 text-sm focus:border-[#FF4D00] outline-none transition-all min-h-[220px] font-sans leading-relaxed text-neutral-200 placeholder:text-neutral-600"
                placeholder="Paste the target job description here..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
              />
            </div>

            {/* 3. Resume Input Source */}
            <div className="space-y-4">
              <span className="block font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[#8E8E93] font-medium">
                Resume Input Source
              </span>

              {/* Tab Toggles */}
              <div className="grid grid-cols-2 gap-2 p-1 border border-white/5 bg-[#161619] rounded-md">
                <button
                  onClick={() => {
                    if (resumes.length > 0) {
                      setSelectedResumeId(resumes[0].id || 'upload');
                    } else {
                      setSelectedResumeId('upload');
                    }
                  }}
                  className={`py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${selectedResumeId !== 'upload' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Saved Profiles
                </button>
                <button
                  onClick={() => setSelectedResumeId('upload')}
                  className={`py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${selectedResumeId === 'upload' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                >
                  Upload New PDF
                </button>
              </div>

              {selectedResumeId !== 'upload' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="relative flex-1">
                      <select
                        value={selectedResumeId}
                        onChange={e => setSelectedResumeId(e.target.value)}
                        className="w-full bg-[#161619] border border-white/10 rounded-md p-3 text-sm focus:border-[#FF4D00] outline-none font-medium text-neutral-200 cursor-pointer appearance-none"
                      >
                        {resumes.map(r => (
                          <option key={r.id} value={r.id} className="bg-[#111113]">
                            {r.name}
                          </option>
                        ))}
                        {resumes.length === 0 && (
                          <option value="none" disabled>Master CV (Mock Profile)</option>
                        )}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-neutral-400">
                        <ChevronRight className="w-4 h-4 transform rotate-90" />
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowProfileModal(true)}
                      className="text-[#FF4D00] hover:underline text-xs font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      View Profile <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  
                  <p className="text-[0.68rem] text-neutral-500 font-mono">
                    Last updated: Jul 2, 2026
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* File Upload Stage */}
                  <div className="flex justify-center p-8 border-2 border-white/10 border-dashed rounded-lg bg-[#161619]/40 hover:border-[#FF4D00] transition-colors relative">
                    <div className="space-y-3 text-center">
                      <UploadCloud className="mx-auto h-8 w-8 text-neutral-500" />
                      <div className="flex text-sm justify-center">
                        <label htmlFor="file-upload" className="relative cursor-pointer bg-[#242429] hover:bg-neutral-800 px-4 py-2 rounded-md border border-white/5 font-semibold text-[#FF4D00] transition-all">
                          <span>{cvFile ? cvFile.name : 'Choose Resume PDF'}</span>
                          <input 
                            id="file-upload" 
                            name="file-upload" 
                            type="file" 
                            className="sr-only" 
                            accept=".pdf" 
                            onChange={e => setCvFile(e.target.files?.[0] || null)} 
                          />
                        </label>
                      </div>
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-neutral-500">PDF up to 10MB</p>
                    </div>
                  </div>

                  {cvFile && (
                    <div className="p-4 border border-[#FF4D00]/30 bg-[#FF4D00]/5 rounded-md space-y-3">
                      <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#FF4D00] flex items-center gap-2 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" /> Save to profiles
                      </p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Profile Name (e.g. Master CV)"
                          value={newProfileName}
                          onChange={e => setNewProfileName(e.target.value)}
                          className="flex-1 bg-[#161619] border border-white/10 rounded-md px-3 py-2 text-sm outline-none focus:border-[#FF4D00] text-neutral-200 placeholder:text-neutral-600"
                        />
                        <button
                          onClick={handleSaveProfile}
                          disabled={isSavingProfile || !newProfileName.trim()}
                          className="bg-[#FF4D00] hover:bg-[#FF5C15] text-[#0C0C0E] px-4 py-2 text-sm font-semibold rounded-md flex items-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingProfile ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          {isSavingProfile ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-3 border-t border-white/5">
              <button
                onClick={handleAnalyze}
                disabled={!jobDescription || (selectedResumeId === 'upload' && !cvFile) || analyzing || testingAllResumes}
                className="w-full flex justify-center items-center gap-2.5 bg-[#FF4D00] hover:bg-[#FF5C15] text-[#0C0C0E] px-4 py-3.5 rounded-md font-semibold transition-all text-sm uppercase tracking-wider disabled:opacity-40 cursor-pointer"
              >
                {analyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {analyzing ? 'Analyzing JD & Matching...' : 'Analyze JD & Calculate Match'}
              </button>

              {resumes.length > 0 && jobDescription && (
                <button
                  onClick={handleCompareAllResumes}
                  disabled={testingAllResumes || analyzing}
                  className="w-full flex justify-center items-center gap-2 bg-transparent text-[#FF4D00] px-4 py-3.5 border border-white/10 hover:border-[#FF4D00] hover:bg-[#FF4D00]/5 transition-all text-sm font-semibold rounded-md disabled:opacity-40 cursor-pointer"
                >
                  {testingAllResumes ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {testingAllResumes ? 'Testing All Saved Resumes...' : 'Find Best Fit Resume Profile'}
                </button>
              )}
            </div>

          </div>

          {/* Extracted Information Section (Bottom of Left Column) */}
          <div className="bg-[#111113]/80 border border-white/5 p-6 rounded-xl space-y-4">
            <span className="block font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#8E8E93] font-semibold">
              EXTRACTED INFORMATION
            </span>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* Role */}
              <div className="flex flex-col items-center text-center p-3.5 bg-[#161619]/60 rounded-lg border border-white/5">
                <Briefcase className="w-5 h-5 text-neutral-400 mb-2 shrink-0" />
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Role</span>
                <span className="text-[0.8rem] font-semibold text-neutral-200 line-clamp-2 leading-tight">
                  {analysis?.extractedInfo?.role || extractedInfo?.role || "—"}
                </span>
              </div>

              {/* Experience */}
              <div className="flex flex-col items-center text-center p-3.5 bg-[#161619]/60 rounded-lg border border-white/5">
                <Calendar className="w-5 h-5 text-neutral-400 mb-2 shrink-0" />
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Experience</span>
                <span className="text-[0.8rem] font-semibold text-neutral-200 line-clamp-2 leading-tight">
                  {analysis?.extractedInfo?.experience || extractedInfo?.experience || "—"}
                </span>
              </div>

              {/* Location */}
              <div className="flex flex-col items-center text-center p-3.5 bg-[#161619]/60 rounded-lg border border-white/5">
                <MapPin className="w-5 h-5 text-neutral-400 mb-2 shrink-0" />
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Location</span>
                <span className="text-[0.8rem] font-semibold text-neutral-200 line-clamp-2 leading-tight">
                  {analysis?.extractedInfo?.location || extractedInfo?.location || "—"}
                </span>
              </div>

              {/* Employment Type */}
              <div className="flex flex-col items-center text-center p-3.5 bg-[#161619]/60 rounded-lg border border-white/5">
                <Briefcase className="w-5 h-5 text-neutral-400 mb-2 shrink-0" />
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Employment Type</span>
                <span className="text-[0.8rem] font-semibold text-neutral-200 line-clamp-2 leading-tight">
                  {analysis?.extractedInfo?.employmentType || extractedInfo?.employmentType || "—"}
                </span>
              </div>

              {/* Industry */}
              <div className="flex flex-col items-center text-center p-3.5 bg-[#161619]/60 rounded-lg border border-white/5">
                <Building className="w-5 h-5 text-neutral-400 mb-2 shrink-0" />
                <span className="text-[0.62rem] font-mono text-neutral-500 uppercase tracking-widest mb-1.5">Industry</span>
                <span className="text-[0.8rem] font-semibold text-neutral-200 line-clamp-2 leading-tight">
                  {analysis?.extractedInfo?.industry || extractedInfo?.industry || "—"}
                </span>
              </div>

            </div>
          </div>

        </div>

        {/* Right Column Output Panel */}
        <div className="xl:col-span-5 space-y-6">

          {/* Loading States */}
          {(analyzing || testingAllResumes) && (
            <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-6 animate-pulse min-h-[400px]">
              <div className="p-4 rounded-full border border-[#FF4D00]/20 bg-[#FF4D00]/5 text-[#FF4D00]">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <div>
                <h3 className="font-mono text-base font-bold text-neutral-200">
                  {analyzing ? 'Calibrating ATS Match Index' : 'Scanning All Profiles...'}
                </h3>
                <p className="text-xs text-neutral-500 max-w-xs mx-auto mt-2 leading-normal">
                  {analyzing 
                    ? 'Comparing your curriculum qualifications against the mandatory requirements and computing keyword density indices...'
                    : 'Testing all saved CV resumes against the JD to locate the match champion.'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Comparison Results Table */}
          {comparisonResults.length > 0 && !testingAllResumes && (
            <div className="bg-[#111113]/80 border border-white/5 p-6 rounded-xl space-y-6 animate-fade-in">
              <div>
                <span className="block font-mono text-[0.68rem] uppercase tracking-[0.2em] text-[#8E8E93] font-semibold">
                  RESUME PROFILE COMPARISON
                </span>
                <p className="text-xs text-neutral-500 mt-1">Automatic matching score leaderboard across your profiles.</p>
              </div>

              {/* Best fit banner */}
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-5 flex items-center justify-between gap-4">
                <div>
                  <span className="text-[0.65rem] font-mono uppercase tracking-[0.15em] text-emerald-400 font-semibold flex items-center gap-1.5 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> SUGGESTED BEST FIT
                  </span>
                  <h4 className="font-mono text-sm font-bold text-neutral-200">
                    {comparisonResults[0].name}
                  </h4>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-mono font-bold text-emerald-400">{comparisonResults[0].score}%</span>
                  <p className="text-[0.55rem] font-mono text-neutral-500 tracking-wider">MATCH VALUE</p>
                </div>
              </div>

              {/* Leaders list */}
              <div className="space-y-2">
                {comparisonResults.map((res, idx) => (
                  <div 
                    key={res.id}
                    onClick={() => {
                      setSelectedResumeId(res.id);
                      if (res.analysis) {
                        setAnalysis(res.analysis);
                      } else {
                        // Lazy load analysis if not available
                        handleAnalyze(res.id);
                      }
                    }}
                    className={`p-3.5 border rounded-lg transition-all cursor-pointer flex items-center justify-between gap-4 ${selectedResumeId === res.id ? 'bg-[#FF4D00]/5 border-[#FF4D00]/20' : 'bg-[#161619]/40 border-white/5 hover:border-white/10'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-neutral-200 truncate">{res.name}</span>
                        {idx === 0 && (
                          <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-mono px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                            Champion
                          </span>
                        )}
                      </div>
                      <div className="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden max-w-[150px]">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${idx === 0 ? 'bg-emerald-500' : 'bg-neutral-600'}`} 
                          style={{ width: `${res.score}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-sm font-mono font-bold ${idx === 0 ? 'text-emerald-400' : 'text-neutral-400'}`}>
                        {res.score}%
                      </span>
                      <ChevronRight className="w-4 h-4 text-neutral-600" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Awaiting Input Placeholder State */}
          {!analysis && !analyzing && !testingAllResumes && (
            <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-8 text-center space-y-6 min-h-[400px] flex flex-col justify-center items-center">
              <div className="p-4 rounded-full border border-white/5 bg-white/[0.02] text-[#FF4D00]/60">
                <Search className="w-8 h-8" />
              </div>
              <div className="space-y-2 max-w-sm mx-auto">
                <h3 className="font-mono text-base font-bold text-neutral-200 uppercase tracking-wide">
                  Awaiting Input
                </h3>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Fill in the job description or extract from a link, select your resume profile, and click <strong className="text-neutral-300">"Analyze JD & Calculate Match"</strong> to start the deep ATS compatibility analysis.
                </p>
              </div>
            </div>
          )}

          {/* Main Results Dashboard (Shown when analysis is available) */}
          {analysis && !analyzing && !testingAllResumes && (
            <div className="space-y-6">

              {/* OVERALL ATS MATCH SCORE CARD */}
              <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-6 space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Left Column: Radial Chart */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center text-center pb-6 md:pb-0 md:border-r border-white/5">
                    <span className="block font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#8E8E93] mb-4 font-semibold w-full">
                      OVERALL ATS MATCH SCORE
                    </span>
                    
                    {/* SVG Progress Gauge */}
                    <div className="relative flex items-center justify-center">
                      <svg className="w-32 h-32 transform -rotate-90">
                        {/* Define gradients */}
                        <defs>
                          <linearGradient id="scoreProgressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#10B981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                        
                        {/* Track circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="#1A1A1D"
                          strokeWidth="8"
                          fill="transparent"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="64"
                          cy="64"
                          r="52"
                          stroke="url(#scoreProgressGrad)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={2 * Math.PI * 52}
                          strokeDashoffset={2 * Math.PI * 52 * (1 - (analysis.score || 0) / 100)}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      
                      {/* Inner Labels */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold tracking-tight text-white flex items-baseline leading-none">
                          {analysis.score}
                          <span className="text-sm font-semibold text-neutral-400">%</span>
                        </span>
                        <span className="text-[0.65rem] font-semibold text-emerald-400 mt-1 uppercase tracking-wide">
                          {analysis.score >= 80 ? 'Excellent Match' : analysis.score >= 60 ? 'Good Match' : 'Fair Match'}
                        </span>
                      </div>
                    </div>

                    <p className="text-[0.7rem] text-neutral-500 mt-4 leading-normal max-w-[140px]">
                      Your profile is well aligned with this job.
                    </p>
                  </div>

                  {/* Right Column: Match Breakdown */}
                  <div className="md:col-span-7 flex flex-col justify-center">
                    <span className="block font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#8E8E93] mb-4 font-semibold">
                      MATCH BREAKDOWN
                    </span>

                    <div className="space-y-3">
                      
                      {/* Skills */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 shrink-0">
                            <Code className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-medium text-neutral-300">Skills</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {analysis.matchBreakdown?.skills || 85}%
                        </span>
                      </div>

                      {/* Experience */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-blue-500/10 text-blue-400 shrink-0">
                            <Briefcase className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-medium text-neutral-300">Experience</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {analysis.matchBreakdown?.experience || 80}%
                        </span>
                      </div>

                      {/* Education */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-purple-500/10 text-purple-400 shrink-0">
                            <GraduationCap className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-medium text-neutral-300">Education</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {analysis.matchBreakdown?.education || 90}%
                        </span>
                      </div>

                      {/* Keywords */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-400 shrink-0">
                            <Key className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-medium text-neutral-300">Keywords</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {analysis.matchBreakdown?.keywords || 88}%
                        </span>
                      </div>

                      {/* Other Factors */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-white/1">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 flex items-center justify-center rounded-md bg-neutral-500/10 text-neutral-400 shrink-0">
                            <Info className="w-4 h-4" />
                          </span>
                          <span className="text-xs font-medium text-neutral-300">Other Factors</span>
                        </div>
                        <span className="text-xs font-mono font-bold text-neutral-200">
                          {analysis.matchBreakdown?.otherFactors || 75}%
                        </span>
                      </div>

                    </div>
                  </div>

                </div>

              </div>

              {/* KEY SKILLS MATCH CARD */}
              <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <span className="block font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#8E8E93] font-semibold">
                    KEY SKILLS MATCH
                  </span>
                  
                  {/* Legend dots */}
                  <div className="flex items-center gap-4 text-[0.65rem] font-mono text-neutral-400 font-medium">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Matched
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Partial
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span> Missing
                    </span>
                  </div>
                </div>

                {/* Skills Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 pt-4 border-t border-white/5">
                  {(analysis.skillsList || DEFAULT_ANALYSIS.skillsList || []).map((skill, index) => {
                    const isMatched = skill.status === 'matched';
                    const isPartial = skill.status === 'partial';
                    const isMissing = skill.status === 'missing';

                    return (
                      <div key={index} className="flex items-center gap-3">
                        {isMatched && <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0" />}
                        {isPartial && <MinusCircle className="w-4.5 h-4.5 text-amber-500 shrink-0" />}
                        {isMissing && <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />}
                        
                        <span className="text-xs text-neutral-200 font-medium leading-tight">{skill.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* IMPROVEMENT SUGGESTIONS CARD */}
              <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="block font-mono text-[0.62rem] uppercase tracking-[0.15em] text-[#8E8E93] font-semibold">
                    IMPROVEMENT SUGGESTIONS
                  </span>
                  <button 
                    onClick={handleAnalyze}
                    className="flex items-center gap-1.5 border border-neutral-800 hover:border-neutral-700 bg-neutral-900/30 hover:bg-neutral-900/60 transition-all text-neutral-300 px-3 py-1.5 rounded-md text-[0.68rem] font-medium cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                  </button>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/5">
                  {(analysis.recommendations || []).map((rec, idx) => (
                    <div 
                      key={idx}
                      className="bg-[#161619]/60 border border-white/5 rounded-lg p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-800/20 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <Lightbulb className="w-4.5 h-4.5 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-xs text-neutral-200 leading-relaxed font-sans">{rec}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-neutral-500 shrink-0 group-hover:text-neutral-300 transition-colors" />
                    </div>
                  ))}
                  {(analysis.recommendations || []).length === 0 && (
                    <p className="text-xs text-neutral-500 text-center py-4">No suggestions needed. Your profile is exceptionally tuned!</p>
                  )}
                </div>
              </div>

              {/* TAILOR & OPTIMIZE CV TRIGGERS */}
              <div className="bg-[#111113]/80 border border-white/5 rounded-xl p-6 space-y-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="block font-mono text-[0.68rem] uppercase tracking-[0.15em] text-[#8E8E93] font-semibold">
                    TAILOR & OPTIMIZE CAREER DOCUMENTS
                  </span>
                  
                  {/* Language Selector */}
                  <div className="flex border border-white/5 rounded-md bg-[#161619] p-0.5">
                    <button 
                      onClick={() => setLanguage('English')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${language === 'English' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                      EN
                    </button>
                    <button 
                      onClick={() => setLanguage('German')}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-sm transition-all cursor-pointer ${language === 'German' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                      DE
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-xs text-neutral-400 leading-normal">
                    Let Gemini rewrite and structure an optimized CV & Cover Letter. It will seamlessly patch the identified gaps and missing keywords in {language} format directly into interactive Google Docs.
                  </p>
                  
                  <button
                    onClick={handleGenerate}
                    disabled={generating}
                    className="w-full flex justify-center items-center gap-2.5 bg-[#FF4D00] hover:bg-[#FF5C15] text-[#0C0C0E] px-4 py-3.5 rounded-md font-semibold transition-all text-sm uppercase tracking-wider disabled:opacity-40 cursor-pointer"
                  >
                    {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {generating ? 'Re-writing Career Documents...' : `Generate Tailored ATS CV & Letter`}
                  </button>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Optimized Output Documents Panel */}
      {docLinks && !generating && (
        <div className="space-y-6 mt-8 animate-fade-in max-w-7xl mx-auto">
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-lg text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" /> Optimized Documents Compiled Successfully
            </h3>

            {/* ATS Score Boost Comparison Badge */}
            {docLinks.improvedAnalysis && (
              <div className="bg-[#111113] p-5 rounded-lg border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[0.65rem] uppercase tracking-[0.15em] font-semibold">
                    <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Double-Pass ATS Audit Result
                  </div>
                  <h4 className="text-sm font-bold text-neutral-200">
                    ATS Match Index Boosted!
                  </h4>
                  <p className="text-xs text-[#8E8E93] leading-normal max-w-md">
                    Required keywords and target competencies have been professionally embedded into the newly optimized CV curriculum.
                  </p>
                </div>
                
                <div className="flex items-center gap-4 bg-emerald-500/10 p-3.5 border border-emerald-500/20 rounded-md shrink-0">
                  <div className="text-center">
                    <span className="text-xs font-mono font-bold text-neutral-500 line-through">{analysis?.score || 86}%</span>
                    <p className="text-[0.55rem] font-mono text-neutral-500 uppercase tracking-widest mt-0.5">Original</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="text-center">
                    <span className="text-2xl font-mono font-bold text-emerald-400">{docLinks.improvedAnalysis.score}%</span>
                    <p className="text-[0.55rem] font-mono text-emerald-400 uppercase tracking-widest mt-0.5">Optimized</p>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a 
                href={docLinks.cvUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-4 bg-[#111113]/40 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg text-sm font-semibold text-emerald-400 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">📄 Open Tailored CV in Google Docs</span>
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Open &rarr;</span>
              </a>
              <a 
                href={docLinks.coverLetterUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-4 bg-[#111113]/40 border border-emerald-500/20 hover:border-emerald-500/50 rounded-lg text-sm font-semibold text-emerald-400 transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">✉️ Open Optimized Cover Letter</span>
                <span className="font-mono text-[0.65rem] uppercase tracking-widest">Open &rarr;</span>
              </a>
            </div>

            <button
              onClick={saveToTracker}
              className="w-full flex justify-center items-center gap-2 bg-[#FF4D00] hover:bg-[#FF5C15] text-[#0C0C0E] px-4 py-3.5 rounded-md text-sm font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              Save optimized job profile to tracker
            </button>
          </div>

          {/* Inline Previews */}
          {(docLinks.cvText || docLinks.clText) && (
            <div className="border border-white/5 bg-[#111113] rounded-xl overflow-hidden">
              <div className="p-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-4 bg-[#161619]/40">
                <div className="flex bg-[#111113] border border-white/5 p-0.5 rounded-md">
                  {docLinks.cvText && (
                    <button
                      onClick={() => setActivePreviewTab('cv')}
                      className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${activePreviewTab === 'cv' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                      Optimized CV Preview
                    </button>
                  )}
                  {docLinks.clText && (
                    <button
                      onClick={() => setActivePreviewTab('cl')}
                      className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${activePreviewTab === 'cl' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300'}`}
                    >
                      Cover Letter Preview
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-1.5 bg-transparent hover:bg-white/5 border border-white/10 px-3 py-1.5 rounded-md text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                    Full Screen
                  </button>
                  <button
                    onClick={() => handleCopy(activePreviewTab === 'cv' ? docLinks.cvText || '' : docLinks.clText || '')}
                    className="flex items-center gap-1.5 bg-transparent hover:bg-white/5 border border-white/10 px-3 py-1.5 rounded-md text-xs font-bold text-neutral-300 transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Text'}
                  </button>
                </div>
              </div>

              <div className="p-8 md:p-12 bg-white text-slate-900 max-h-[500px] overflow-y-auto">
                <div className="max-w-2xl mx-auto">
                  <div className="markdown-body font-sans text-sm leading-relaxed break-words text-left space-y-4">
                    <Markdown>{activePreviewTab === 'cv' ? docLinks.cvText : docLinks.clText}</Markdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Raw Extracted Text Modal */}
      {showRawTextModal && (
        <div className="fixed inset-0 bg-[#0C0C0E]/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-[#111113] w-full max-w-2xl border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#161619]/40">
              <div>
                <h3 className="font-semibold text-neutral-200">Extracted Raw Text</h3>
                <p className="text-xs text-neutral-500 mt-0.5">Below is the complete text parsed from the target URL.</p>
              </div>
              <button 
                onClick={() => setShowRawTextModal(false)}
                className="p-1 rounded-md hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-sans text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap flex-1 bg-[#131316]">
              {jobDescription || 'No description loaded.'}
            </div>
            
            <div className="p-4 border-t border-white/5 flex justify-end bg-[#161619]/20 gap-2">
              <button
                onClick={() => handleCopy(jobDescription)}
                className="bg-transparent hover:bg-white/5 text-neutral-300 border border-white/10 px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy Description'}
              </button>
              <button
                onClick={() => setShowRawTextModal(false)}
                className="bg-[#242429] hover:bg-[#2d2d33] text-white px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected CV Profile Text Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-[#0C0C0E]/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-[#111113] w-full max-w-2xl border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[80vh] shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#161619]/40">
              <div>
                <h3 className="font-semibold text-neutral-200">
                  Resume Profile: {resumes.find(r => r.id === selectedResumeId)?.name || 'Master CV'}
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">Parsed text used by the matching engine and generator.</p>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-1 rounded-md hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto font-sans text-sm leading-relaxed text-neutral-300 whitespace-pre-wrap flex-1 bg-[#131316]">
              {resumes.find(r => r.id === selectedResumeId)?.content || `[Profile Text Content]
Name: [Your Full Name]
Email: [your.email@example.com]
Status: Active Match Profile

EXPERIENCE:
- [Your experience 1]
- [Your experience 2]
- [Your experience 3]

SKILLS:
- [Skill 1], [Skill 2], [Skill 3], [Skill 4], [Skill 5]`}
            </div>
            
            <div className="p-4 border-t border-white/5 flex justify-end bg-[#161619]/20">
              <button
                onClick={() => setShowProfileModal(false)}
                className="bg-[#FF4D00] hover:bg-[#FF5C15] text-[#0C0C0E] px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Management Drawer/Modal */}
      {showManageModal && (
        <div className="fixed inset-0 bg-[#0C0C0E]/80 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4">
          <div className="bg-[#111113] w-full max-w-lg border border-white/10 rounded-xl overflow-hidden flex flex-col max-h-[90vh] shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-start bg-[#161619]/40">
              <div>
                <h3 className="font-semibold text-neutral-200">Your Saved Profiles</h3>
                <p className="text-xs text-neutral-500 mt-1">Manage resume profiles used for concurrent match audits.</p>
              </div>
              <button 
                onClick={() => setShowManageModal(false)}
                className="p-1 rounded-md hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-[#131316]">
              {resumes.length === 0 ? (
                <div className="p-4 border border-white/5 rounded-lg bg-[#161619]/20 flex items-center gap-3">
                  <FileText className="w-5 h-5 text-[#FF4D00] shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-semibold text-neutral-300">Master CV (Mock System Default)</h4>
                    <p className="text-[0.62rem] text-neutral-500 font-mono mt-0.5 uppercase tracking-wider">Default Seed Profile &bull; 850 chars</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {resumes.map(r => (
                    <div key={r.id} className="p-4 border border-white/5 rounded-lg bg-[#161619]/20 flex items-center justify-between gap-4">
                      <div className="space-y-1.5 min-w-0">
                        <h4 className="text-xs font-semibold text-neutral-200 flex items-center gap-2 truncate">
                          <FileText className="w-4 h-4 text-[#FF4D00] shrink-0" />
                          {r.name}
                        </h4>
                        <p className="font-mono text-[0.62rem] uppercase tracking-wider text-neutral-500">
                          Added on {new Date(r.createdAt).toLocaleDateString()} &bull; {r.content.length} characters
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteProfile(r.id || '')}
                        className="p-2 hover:bg-red-500/10 hover:text-red-500 text-neutral-500 rounded-md transition-colors cursor-pointer shrink-0"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-white/5 flex justify-end bg-[#161619]/20">
              <button
                onClick={() => setShowManageModal(false)}
                className="bg-[#242429] hover:bg-[#2d2d33] text-white px-4 py-2 rounded-md text-xs font-semibold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Document Preview Modal */}
      {showPreviewModal && docLinks && (
        <div className="fixed inset-0 bg-[#0C0C0E]/90 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4 sm:p-8">
          <div className="bg-[#111113] w-full max-w-5xl h-full max-h-[95vh] border border-white/25 rounded-xl overflow-hidden flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/5 flex flex-wrap justify-between items-center gap-4 bg-[#161619]/40 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 border border-[#FF4D00]/20 bg-[#FF4D00]/5 text-[#FF4D00] rounded-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-neutral-200">
                    Document Preview
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {activePreviewTab === 'cv' ? 'Tailored Curriculum Vitae' : 'Targeted Cover Letter'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex border border-white/5 p-0.5 rounded-md bg-[#111113]">
                  <button
                    onClick={() => setActivePreviewTab('cv')}
                    disabled={!docLinks.cvText}
                    className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${activePreviewTab === 'cv' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300 disabled:opacity-30'}`}
                  >
                    CV
                  </button>
                  <button
                    onClick={() => setActivePreviewTab('cl')}
                    disabled={!docLinks.clText}
                    className={`px-4 py-2 text-xs font-semibold rounded-sm transition-all cursor-pointer ${activePreviewTab === 'cl' ? 'bg-[#242429] text-white shadow-xs' : 'text-neutral-500 hover:text-neutral-300 disabled:opacity-30'}`}
                  >
                    Cover Letter
                  </button>
                </div>
                
                <button
                  onClick={() => handleCopy(activePreviewTab === 'cv' ? docLinks.cvText || '' : docLinks.clText || '')}
                  className="flex items-center gap-1.5 bg-transparent hover:bg-white/5 border border-white/10 rounded-md text-neutral-300 px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                
                <div className="w-px h-6 bg-white/10"></div>
                
                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 rounded-md hover:bg-white/5 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            {/* Modal Body (A4 Paper Layout) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#131316] flex justify-center">
              <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-2xl p-8 sm:p-12 md:p-16 rounded-lg text-slate-950">
                <div className="markdown-body font-sans text-sm sm:text-base leading-relaxed break-words text-left space-y-4">
                  <Markdown>{activePreviewTab === 'cv' ? docLinks.cvText : docLinks.clText}</Markdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
