import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { JobApplication } from '../types';
import { Briefcase, CheckCircle, Clock, XCircle, Plus, FileText, PlusCircle, LayoutDashboard, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export function Dashboard({ user }: { user: User }) {
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFabOpen, setIsFabOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const q = query(
          collection(db, 'applications'),
          where('userId', '==', user.uid)
        );
        const querySnapshot = await getDocs(q);
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as JobApplication));
        setApps(data);
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
    fetchApps();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const total = apps.length;
  const interviews = apps.filter(a => a.status === 'Interview').length;
  const offers = apps.filter(a => a.status === 'Offer').length;
  const rejected = apps.filter(a => a.status === 'Rejected').length;

  return (
    <div className="space-y-12 animate-fade-in max-w-5xl relative">
      <header className="flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#8B5CF6] flex items-center gap-3">
            <LayoutDashboard className="w-6 h-6 text-[#8B5CF6]" /> DASHBOARD
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#8B5CF6]/10 border border-[#8B5CF6]/20 px-3 py-1.5 text-xs font-mono text-[#8B5CF6]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> OPERATIONAL STATUS: ACTIVE
        </div>
      </header>

      <div className="flex items-center justify-between bg-[#111113] border border-white/10 p-6 rounded-none">
        <div>
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">Welcome back</div>
          <h2 className="text-3xl font-bold tracking-[-0.04em] text-[#E4E4E4] leading-tight">
            {user.displayName || 'Developer'}
          </h2>
        </div>
        {user.photoURL && (
          <img src={user.photoURL} alt="Profile" className="w-16 h-16 border-2 border-[#8B5CF6] object-cover" referrerPolicy="no-referrer" />
        )}
      </div>

      <div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <StatCard label="Total Applications" value={total} />
          <StatCard label="Interviews" value={interviews} />
          <StatCard label="Offers" value={offers} />
          <StatCard label="Rejected" value={rejected} />
        </div>

        <div className="mt-16">
          <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-4 flex justify-between items-center">
            <span>Recent Applications</span>
            <Link to="/tracker" className="hover:text-[#FF4D00] transition-colors">View full board &rarr;</Link>
          </div>
          
          <table className="w-full border-t-2 border-[#E4E4E4]">
            <tbody>
              {apps.slice(0, 5).map(app => (
                <tr key={app.id} className="border-b border-white/10 group hover:bg-white/5 transition-colors">
                  <td className="py-6 px-4 font-medium">{app.role}</td>
                  <td className="py-6 px-4 opacity-70">{app.company}</td>
                  <td className="py-6 px-4 font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 text-right">
                    <span className={
                      app.status === 'Offer' ? 'text-emerald-400' :
                      app.status === 'Rejected' ? 'text-rose-400' :
                      app.status === 'Interview' ? 'text-amber-400' :
                      app.status === 'Applied' ? 'text-blue-400' : ''
                    }>
                      {app.status}
                    </span>
                  </td>
                </tr>
              ))}
              {apps.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-12 text-center opacity-50">
                    No application activities found. <Link to="/tracker" className="text-[#FF4D00] hover:underline">Add your first job application</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAB Menu */}
      <div className="fixed bottom-8 right-8 flex flex-col-reverse items-end gap-4 z-50">
          <button 
            onClick={() => setIsFabOpen(!isFabOpen)}
            className="w-14 h-14 bg-[#FF4D00] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform"
          >
            <Plus className="w-8 h-8" />
          </button>
          
          {isFabOpen && (
              <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4">
                  <button onClick={() => navigate('/tracker')} className="flex items-center gap-2 bg-[#1a1a1c] border border-white/10 p-3 rounded-lg hover:border-[#FF4D00] transition-colors">
                      <Briefcase className="w-4 h-4 text-[#FF4D00]" />
                      <span className="text-sm font-mono text-gray-200">New Job</span>
                  </button>
                  <button onClick={() => navigate('/documents')} className="flex items-center gap-2 bg-[#1a1a1c] border border-white/10 p-3 rounded-lg hover:border-[#FF4D00] transition-colors">
                      <FileText className="w-4 h-4 text-[#FF4D00]" />
                      <span className="text-sm font-mono text-gray-200">New Document</span>
                  </button>
              </div>
          )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-white/10 p-6 flex flex-col justify-between hover:border-white/30 transition-colors">
      <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60 mb-2">{label}</div>
      <div className="font-mono text-[3rem] font-bold leading-none">{value}</div>
    </div>
  );
}
