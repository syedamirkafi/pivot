import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { initAuth, googleSignIn } from './firebase';
import type { User } from 'firebase/auth';
import { Dashboard } from './pages/Dashboard';
import { JobAnalyzer } from './pages/JobAnalyzer';
import { JobTracker } from './pages/JobTracker';
import { ChatAssistant } from './pages/ChatAssistant';
import { ExtensionGuide } from './pages/ExtensionGuide';
import { Documents } from './pages/Documents';
import { CalendarPage } from './pages/Calendar';
import { Builder } from './pages/Builder';
import { Browser } from './pages/Browser';
import { FocusPlayer } from './pages/FocusPlayer';

export default function App() {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setUser(user);
        setToken(token);
        setNeedsAuth(false);
        setIsLoading(false);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF4D00]"></div>
      </div>
    );
  }

  if (needsAuth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center relative p-4 overflow-hidden">
        <div className="max-w-md w-full p-10 border border-white/10 bg-[#111113] text-center animate-fade-in relative z-10">
          <div className="mb-8">
            <div className="font-mono text-4xl font-bold mb-4 text-[#FF4D00]">
              PIVOT
            </div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">Sign in to orchestrate your career operations, analyze match metrics, and generate tailored CV/letters.</p>
          </div>
          
          <button 
            onClick={handleLogin} 
            disabled={isLoggingIn}
            className="w-full flex justify-center items-center gap-3 py-4 px-4 border border-white/10 hover:border-[#FF4D00] bg-transparent text-[#E4E4E4] transition-colors cursor-pointer disabled:opacity-50 font-mono text-sm uppercase tracking-wider"
          >
            {isLoggingIn ? (
               <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#FF4D00]"></div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Continue with Google
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={user} />}>
          <Route index element={<Dashboard user={user!} />} />
          <Route path="browser" element={<Browser />} />
          <Route path="analyzer" element={<JobAnalyzer user={user!} token={token!} />} />
          <Route path="tracker" element={<JobTracker user={user!} />} />
          <Route path="assistant" element={<ChatAssistant user={user!} />} />
          <Route path="extension" element={<ExtensionGuide />} />
          <Route path="documents" element={<Documents user={user!} />} />
          <Route path="calendar" element={<CalendarPage user={user!} />} />
          <Route path="builder" element={<Builder user={user!} />} />
          <Route path="focus" element={<div className="h-full" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
