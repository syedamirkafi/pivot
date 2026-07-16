import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
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
  const dummyUser = { uid: 'local-user', displayName: 'Local User' } as any;
  const dummyToken = '';

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout user={dummyUser} />}>
          <Route index element={<Dashboard user={dummyUser} />} />
          <Route path="browser" element={<Browser />} />
          <Route path="analyzer" element={<JobAnalyzer user={dummyUser} token={dummyToken} />} />
          <Route path="tracker" element={<JobTracker user={dummyUser} />} />
          <Route path="assistant" element={<ChatAssistant user={dummyUser} />} />
          <Route path="extension" element={<ExtensionGuide />} />
          <Route path="documents" element={<Documents user={dummyUser} />} />
          <Route path="calendar" element={<CalendarPage user={dummyUser} />} />
          <Route path="builder" element={<Builder user={dummyUser} />} />
          <Route path="focus" element={<div className="h-full" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
