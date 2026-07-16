import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, orderBy } from 'firebase/firestore';
import { JobApplication, ResumeProfile } from '../types';
import { Plus, Edit2, Trash2, RefreshCw, ExternalLink, Wand2, Download, FileSignature, Sparkles, Briefcase } from 'lucide-react';
import { format } from 'date-fns';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ResumePDF } from '../components/ResumePDF';

export function JobTracker({ user }: { user: User }) {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [resumes, setResumes] = useState<ResumeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editApp, setEditApp] = useState<JobApplication | null>(null);
  const [appToDelete, setAppToDelete] = useState<JobApplication | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [generatingCvFor, setGeneratingCvFor] = useState<string | null>(null);
  const [generatingClFor, setGeneratingClFor] = useState<string | null>(null);

  const [form, setForm] = useState({
    company: '',
    role: '',
    status: 'Draft' as JobApplication['status'],
    dateApplied: format(new Date(), 'yyyy-MM-dd'),
    jobLink: '',
    jobDescription: ''
  });

  useEffect(() => {
    fetchAppsAndResumes();
  }, [user.uid]);

  const fetchAppsAndResumes = async () => {
    try {
      const qApps = query(
        collection(db, 'applications'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const appsSnap = await getDocs(qApps);
      const appsData = appsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
      setApps(appsData);

      const qRes = query(collection(db, 'resumes'), where('userId', '==', user.uid));
      const resSnap = await getDocs(qRes);
      const resData = resSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ResumeProfile));
      setResumes(resData);
    } catch (error) {
      try {
        handleFirestoreError(error, OperationType.LIST, 'applications');
      } catch (e) {
        // Handled
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editApp && editApp.id) {
        await updateDoc(doc(db, 'applications', editApp.id), {
          ...form
        });
      } else {
        await addDoc(collection(db, 'applications'), {
          ...form,
          userId: user.uid,
          createdAt: Date.now()
        });
      }
      setShowModal(false);
      fetchAppsAndResumes();
      resetForm();
    } catch (error) {
      console.error('Error saving application:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'applications', id));
      fetchAppsAndResumes();
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };

  const handleStatusChange = async (appId: string, newStatus: JobApplication['status']) => {
    setApps(prev => prev.map(app => app.id === appId ? { ...app, status: newStatus } : app));
    try {
      await updateDoc(doc(db, 'applications', appId), {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating status:', error);
      fetchAppsAndResumes();
    }
  };

  const handleAutoExtract = async () => {
    if (!form.jobLink) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/extract-job-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: form.jobLink })
      });
      const data = await res.json();
      if (res.ok) {
        setForm(f => ({
          ...f,
          company: data.company || f.company,
          role: data.role || f.role,
          status: data.status || f.status,
          jobDescription: data.jobDescription || f.jobDescription
        }));
      } else {
        alert(data.error || 'Failed to extract job details.');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to connect to extractor API.');
    } finally {
      setExtracting(false);
    }
  };

  const handleGenerateCV = async (app: JobApplication) => {
    if (!app.jobDescription || app.jobDescription.length < 20) {
      alert("Please provide a more detailed job description first.");
      return;
    }
    const masterCv = resumes.find(r => r.name === 'Master CV');
    if (!masterCv || !masterCv.content) {
      alert("Please create and fill out your Master CV in the Documents tab first.");
      return;
    }

    setGeneratingCvFor(app.id!);
    try {
      const response = await fetch('/api/generate-cv-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: app.jobDescription,
          cvText: masterCv.content
        })
      });
      
      const data = await response.json();
      if (response.ok && data.cvText) {
        const newCvDoc = await addDoc(collection(db, 'resumes'), {
          userId: user.uid,
          name: `${app.company} - ${app.role} CV`,
          content: data.cvText,
          type: 'generated',
          jobId: app.id,
          createdAt: Date.now()
        });

        await updateDoc(doc(db, 'applications', app.id!), {
          generatedCvId: newCvDoc.id
        });
        
        await fetchAppsAndResumes();
      } else {
        alert(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error("Error generating CV:", error);
      alert('Network error occurred.');
    } finally {
      setGeneratingCvFor(null);
    }
  };

  const handleGenerateCL = async (app: JobApplication) => {
    if (!app.jobDescription || app.jobDescription.length < 20) {
      alert("Please provide a more detailed job description first.");
      return;
    }
    const masterCv = resumes.find(r => r.name === 'Master CV');
    if (!masterCv || !masterCv.content) {
      alert("Please create and fill out your Master CV in the Documents tab first.");
      return;
    }

    setGeneratingClFor(app.id!);
    try {
      const response = await fetch('/api/generate-cl-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription: app.jobDescription,
          cvText: masterCv.content
        })
      });
      
      const data = await response.json();
      if (response.ok && data.clText) {
        const newClDoc = await addDoc(collection(db, 'resumes'), {
          userId: user.uid,
          name: `${app.company} - ${app.role} Cover Letter`,
          content: data.clText,
          type: 'generated_cl',
          jobId: app.id,
          createdAt: Date.now()
        });

        await updateDoc(doc(db, 'applications', app.id!), {
          generatedCoverLetterId: newClDoc.id
        });
        
        await fetchAppsAndResumes();
      } else {
        alert(data.error || 'Generation failed');
      }
    } catch (error) {
      console.error("Error generating CL:", error);
      alert('Network error occurred.');
    } finally {
      setGeneratingClFor(null);
    }
  };

  const openEdit = (app: JobApplication) => {
    setEditApp(app);
    setForm({
      company: app.company,
      role: app.role,
      status: app.status,
      dateApplied: app.dateApplied || format(new Date(), 'yyyy-MM-dd'),
      jobLink: app.jobLink || '',
      jobDescription: app.jobDescription || ''
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditApp(null);
    setForm({
      company: '',
      role: '',
      status: 'Draft',
      dateApplied: format(new Date(), 'yyyy-MM-dd'),
      jobLink: '',
      jobDescription: ''
    });
  };

  const statusColors = {
    'Draft': 'bg-slate-500/10 text-slate-800 border border-slate-500/20',
    'Applied': 'bg-blue-500/10 text-blue-700 border border-blue-500/20',
    'Interview': 'bg-amber-500/10 text-amber-700 border border-amber-500/20',
    'Offer': 'bg-emerald-500/10 text-emerald-700 border border-emerald-500/20',
    'Rejected': 'bg-rose-500/10 text-rose-700 border border-rose-500/20'
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in max-w-5xl">
      <header className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#F59E0B] flex items-center gap-3">
            <Briefcase className="w-6 h-6 text-[#F59E0B]" /> SAVED JOBS
          </h1>
        </div>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => { resetForm(); setShowModal(true); }}
            className="flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 text-[#F59E0B] hover:bg-[#F59E0B]/20 px-4 py-2 transition-all text-xs font-mono font-bold cursor-pointer rounded-none"
          >
            <Plus className="w-4 h-4" />
            ADD APPLICATION
          </button>
          <div className="flex items-center gap-2 bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-3 py-1.5 text-xs font-mono text-[#F59E0B]">
            <Sparkles className="w-3.5 h-3.5 animate-pulse" /> APPLICATION TRACKER
          </div>
        </div>
      </header>

      <div>
        <table className="w-full text-left border-collapse border-t-2 border-[#E4E4E4]">
          <thead>
            <tr className="border-b border-white/10 font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">
              <th className="py-4 px-4 font-normal">Company</th>
              <th className="py-4 px-4 font-normal">Role</th>
              <th className="py-4 px-4 font-normal">Status</th>
              <th className="py-4 px-4 font-normal">Date Applied</th>
              <th className="py-4 px-4 font-normal">Job Link</th>
              <th className="py-4 px-4 font-normal text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {apps.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center opacity-50 text-sm">
                  No applications yet. Start tracking your opportunities!
                </td>
              </tr>
            ) : apps.map(app => (
              <tr key={app.id} className="hover:bg-white/5 transition-colors cursor-pointer" onClick={() => openEdit(app)}>
                <td className="py-4 px-4 font-medium">{app.company}</td>
                <td className="py-4 px-4 opacity-70">{app.role}</td>
                <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                  <div className="relative inline-block">
                    <select
                      value={app.status}
                      onChange={(e) => handleStatusChange(app.id!, e.target.value as JobApplication['status'])}
                      className={`appearance-none inline-flex items-center pl-0 pr-6 py-1 font-mono text-[0.65rem] uppercase tracking-[0.15em] cursor-pointer bg-transparent outline-none transition-all ${
                        app.status === 'Offer' ? 'text-emerald-400' :
                        app.status === 'Rejected' ? 'text-rose-400' :
                        app.status === 'Interview' ? 'text-amber-400' :
                        app.status === 'Applied' ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    >
                      <option value="Draft" className="bg-[#111113] text-[#E4E4E4]">Draft</option>
                      <option value="Applied" className="bg-[#111113] text-blue-400">Applied</option>
                      <option value="Interview" className="bg-[#111113] text-amber-400">Interview</option>
                      <option value="Offer" className="bg-[#111113] text-emerald-400">Offer</option>
                      <option value="Rejected" className="bg-[#111113] text-rose-400">Rejected</option>
                    </select>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4 font-mono text-[0.8rem] opacity-70">{app.dateApplied}</td>
                <td className="py-4 px-4 text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                  {app.jobLink ? (
                    <a href={app.jobLink} target="_blank" rel="noopener noreferrer" className="text-[#FF4D00] hover:underline inline-flex items-center gap-1">
                      Link <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span className="opacity-30">—</span>
                  )}
                </td>
                <td className="py-4 px-4 flex items-center justify-end gap-3 min-w-[140px]" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleGenerateCV(app)} 
                    className="opacity-50 hover:opacity-100 hover:text-[#FF4D00] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" 
                    title="Generate ATS CV"
                    disabled={generatingCvFor === app.id}
                  >
                    {generatingCvFor === app.id ? <RefreshCw className="w-4 h-4 inline animate-spin" /> : <Wand2 className="w-4 h-4 inline" />}
                  </button>
                  <button 
                    onClick={() => handleGenerateCL(app)} 
                    className="opacity-50 hover:opacity-100 hover:text-[#FF4D00] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" 
                    title="Generate Cover Letter"
                    disabled={generatingClFor === app.id}
                  >
                    {generatingClFor === app.id ? <RefreshCw className="w-4 h-4 inline animate-spin" /> : <FileSignature className="w-4 h-4 inline" />}
                  </button>
                  <button onClick={() => openEdit(app)} className="opacity-50 hover:opacity-100 hover:text-[#FF4D00] transition-colors cursor-pointer" title="Edit">
                    <Edit2 className="w-4 h-4 inline" />
                  </button>
                  <button onClick={() => setAppToDelete(app)} className="opacity-50 hover:opacity-100 hover:text-red-500 transition-colors cursor-pointer" title="Delete">
                    <Trash2 className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-[#111113]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-[#111113] border border-white/10 w-full max-w-lg h-[85vh] max-h-[800px] flex flex-col my-4 overflow-hidden animate-fade-in text-[#E4E4E4]">
            <div className="p-6 border-b border-white/10 shrink-0">
              <h3 className="font-mono font-bold text-lg">{editApp ? 'Edit Application' : 'Add Application'}</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
              
              {/* AI Auto Extraction Section */}
              <div className="border border-[#FF4D00]/30 bg-[#FF4D00]/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#FF4D00]">AI URL Auto-Extractor</span>
                  {extracting && (
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-[#FF4D00] flex items-center gap-1 animate-pulse">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Extracting...
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Paste job listing URL (LinkedIn, Indeed, etc.)"
                    value={form.jobLink}
                    onChange={e => setForm({...form, jobLink: e.target.value})}
                    className="flex-1 bg-transparent border border-white/20 px-3 py-2 text-sm focus:border-[#FF4D00] outline-none transition-all placeholder:text-white/20"
                  />
                  <button
                    type="button"
                    disabled={!form.jobLink || extracting}
                    onClick={handleAutoExtract}
                    className="bg-[#FF4D00] text-[#111113] px-4 py-2 text-sm font-bold hover:bg-[#FF4D00]/90 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                  >
                    Extract
                  </button>
                </div>
                <p className="text-xs opacity-60 leading-normal">
                  Paste the job posting URL and click <strong>Extract</strong>. Gemini will analyze the page and automatically extract the Company, Role, Status, and Job Description.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Company</label>
                  <input
                    required
                    type="text"
                    value={form.company}
                    onChange={e => setForm({...form, company: e.target.value})}
                    className="w-full bg-transparent border border-white/20 p-2.5 text-sm focus:border-[#FF4D00] outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Role</label>
                  <input
                    required
                    type="text"
                    value={form.role}
                    onChange={e => setForm({...form, role: e.target.value})}
                    className="w-full bg-transparent border border-white/20 p-2.5 text-sm focus:border-[#FF4D00] outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm({...form, status: e.target.value as any})}
                    className="w-full bg-[#111113] border border-white/20 p-2.5 text-sm focus:border-[#FF4D00] outline-none transition-all"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Applied">Applied</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Date Applied</label>
                  <input
                    type="date"
                    value={form.dateApplied}
                    onChange={e => setForm({...form, dateApplied: e.target.value})}
                    className="w-full bg-transparent border border-white/20 p-2.5 text-sm focus:border-[#FF4D00] outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Job Description / Details</label>
                <div
                  className="w-full bg-transparent border border-white/20 p-2.5 text-sm transition-all min-h-[100px] font-mono text-gray-300 whitespace-pre-wrap"
                >
                  {form.jobDescription || <span className="opacity-20">No description available.</span>}
                </div>
              </div>

              {editApp && editApp.generatedCvId && (
                <div className="border border-green-500/30 bg-green-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-green-500">Generated ATS CV</span>
                  </div>
                  <p className="text-xs opacity-60 leading-normal">
                    You have generated an ATS-optimized CV for this role.
                  </p>
                  <div className="flex gap-2">
                    {resumes.find(r => r.id === editApp.generatedCvId) ? (
                      <PDFDownloadLink 
                        document={<ResumePDF content={resumes.find(r => r.id === editApp.generatedCvId)!.content} />} 
                        fileName={`${editApp.company}_${editApp.role}_CV.pdf`}
                      >
                        {({ loading }) => (
                          <button
                            type="button"
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-2 text-sm font-bold hover:bg-green-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {loading ? 'Preparing PDF...' : 'Download PDF'}
                          </button>
                        )}
                      </PDFDownloadLink>
                    ) : (
                      <span className="text-sm opacity-50">CV data not loaded yet...</span>
                    )}
                  </div>
                </div>
              )}

              {editApp && editApp.generatedCoverLetterId && (
                <div className="border border-blue-500/30 bg-blue-500/5 p-4 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-blue-500">Generated Cover Letter</span>
                  </div>
                  <p className="text-xs opacity-60 leading-normal">
                    You have generated a targeted Cover Letter for this role.
                  </p>
                  <div className="flex gap-2">
                    {resumes.find(r => r.id === editApp.generatedCoverLetterId) ? (
                      <PDFDownloadLink 
                        document={<ResumePDF content={resumes.find(r => r.id === editApp.generatedCoverLetterId)!.content} />} 
                        fileName={`${editApp.company}_${editApp.role}_CoverLetter.pdf`}
                      >
                        {({ loading }) => (
                          <button
                            type="button"
                            disabled={loading}
                            className="bg-blue-600 text-white px-4 py-2 text-sm font-bold hover:bg-blue-500 disabled:opacity-50 transition-colors cursor-pointer shrink-0 inline-flex items-center gap-2"
                          >
                            <Download className="w-4 h-4" />
                            {loading ? 'Preparing PDF...' : 'Download PDF'}
                          </button>
                        )}
                      </PDFDownloadLink>
                    ) : (
                      <span className="text-sm opacity-50">Cover Letter data not loaded yet...</span>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-6 flex gap-4 justify-end border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold opacity-70 hover:opacity-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-bold text-[#111113] bg-[#FF4D00] hover:bg-[#FF4D00]/90 transition-all cursor-pointer"
                >
                  {editApp ? 'Save Changes' : 'Add Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {appToDelete && (
        <div className="fixed inset-0 bg-[#111113]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-[#111113] border border-white/10 w-full max-w-md overflow-hidden p-6 space-y-6 text-[#E4E4E4]">
            <div className="space-y-2">
              <h3 className="font-mono font-bold text-lg">Delete Job Application?</h3>
              <p className="text-sm opacity-70 leading-relaxed">
                Are you sure you want to delete your saved application for <span className="font-bold text-white">{appToDelete.role}</span> at <span className="font-bold text-white">{appToDelete.company}</span>? This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex gap-4 justify-end pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setAppToDelete(null)}
                className="px-4 py-2 text-sm font-semibold opacity-70 hover:opacity-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (appToDelete.id) {
                    await handleDelete(appToDelete.id);
                    setAppToDelete(null);
                  }
                }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-500 transition-all cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
