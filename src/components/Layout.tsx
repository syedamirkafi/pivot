import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Briefcase, MessageSquare, FileText, Calendar, BookOpen, Search, Music, PanelLeftClose, PanelLeftOpen, Compass, Globe } from 'lucide-react';
import { logout } from '../firebase';
import { FocusPlayer } from '../pages/FocusPlayer';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { User } from 'firebase/auth';
import { ClockWeatherWidget } from './ClockWeatherWidget';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ user }: { user: User | null }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={cn(
          "border-r border-white/10 flex flex-col shrink-0 transition-all duration-300 relative",
          isCollapsed ? "w-[80px] p-4" : "w-[280px] p-6"
        )}
      >
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-8 bg-[#111113] border border-white/10 rounded-full p-1 text-gray-400 hover:text-white transition-colors z-50"
        >
          {isCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <div className={cn("flex flex-col mb-8", isCollapsed ? "items-center gap-4" : "gap-4")}>
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate('/')}
          >
            <Compass className="w-7 h-7 text-[#FF4D00]" />
            {!isCollapsed && (
              <div className="font-sans text-2xl font-bold tracking-tight text-white">
                PIVOT
              </div>
            )}
          </div>
          
          {user && (
            <div className={cn("transition-all duration-300 w-full overflow-hidden", isCollapsed ? "h-0 opacity-0" : "h-auto opacity-100")}>
              <ClockWeatherWidget />
            </div>
          )}
        </div>
        
        <nav className="flex-1 flex flex-col gap-1">
          <NavItem to="/" label="Dashboard" icon={<LayoutDashboard className="w-5 h-5 text-[#8B5CF6]" />} activeColor="text-[#8B5CF6]" isCollapsed={isCollapsed} />
          <NavItem to="/browser" label="Browser" icon={<Globe className="w-5 h-5 text-[#3B82F6]" />} activeColor="text-[#3B82F6]" isCollapsed={isCollapsed} />
          <NavItem to="/analyzer" label="Job Analyzer" icon={<Search className="w-5 h-5 text-[#FF4D00]" />} activeColor="text-[#FF4D00]" isCollapsed={isCollapsed} />
          <NavItem to="/tracker" label="Saved Jobs" icon={<Briefcase className="w-5 h-5 text-[#F59E0B]" />} activeColor="text-[#F59E0B]" isCollapsed={isCollapsed} />
          <NavItem to="/assistant" label="Ask Bro" icon={<MessageSquare className="w-5 h-5 text-[#06B6D4]" />} activeColor="text-[#06B6D4]" isCollapsed={isCollapsed} />
          <NavItem to="/documents" label="Documents" icon={<FileText className="w-5 h-5 text-[#F43F5E]" />} activeColor="text-[#F43F5E]" isCollapsed={isCollapsed} />
          <NavItem to="/calendar" label="Calendar" icon={<Calendar className="w-5 h-5 text-[#10B981]" />} activeColor="text-[#10B981]" isCollapsed={isCollapsed} />
          <NavItem to="/builder" label="Builder" icon={<BookOpen className="w-5 h-5 text-[#A855F7]" />} activeColor="text-[#A855F7]" isCollapsed={isCollapsed} />
          <NavItem to="/focus" label="Spotify" icon={<Music className="w-5 h-5 text-[#1DB954]" />} activeColor="text-[#1DB954]" isCollapsed={isCollapsed} />
        </nav>

        <div className="mt-auto space-y-4">
          {!isCollapsed && (
            <div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.15em] opacity-60">Status</div>
              <p className="text-xs mt-2 flex items-center gap-2 text-emerald-400">
                <span>●</span> Extension Active
              </p>
            </div>
          )}
          
          <div className="border-t border-white/10 pt-4 flex flex-col gap-2">
            {!isCollapsed ? (
              <>
                <button 
                  onClick={() => navigate('/extension')}
                  className="text-left text-sm text-[#E4E4E4] hover:text-[#FF4D00] transition-colors flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  Get Extension
                </button>
                <button 
                  onClick={handleLogout}
                  className="text-left text-sm text-red-500 hover:text-red-400 transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-4">
                 <button 
                  onClick={() => navigate('/extension')}
                  className="text-[#E4E4E4] hover:text-[#FF4D00] transition-colors"
                  title="Get Extension"
                >
                  <BookOpen className="w-5 h-5" />
                </button>
                 <button 
                  onClick={handleLogout}
                  className="text-red-500 hover:text-red-400 transition-colors"
                  title="Sign Out"
                >
                  <div className="w-5 h-5 font-bold font-mono text-xs">EXIT</div>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-16 overflow-y-auto relative">
        <div className={location.pathname === '/focus' ? "h-full block" : "hidden"}>
          <FocusPlayer />
        </div>
        <div className={location.pathname === '/focus' ? "hidden" : "h-full block"}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function NavItem({ to, label, icon, activeColor = "text-[#FF4D00]", isCollapsed }: { to: string; label: string; icon: React.ReactNode; activeColor?: string; isCollapsed: boolean }) {
  return (
    <NavLink
      to={to}
      title={isCollapsed ? label : undefined}
      className={({ isActive }) => cn(
        "flex items-center gap-3 py-4 border-b border-white/5 transition-all font-mono uppercase tracking-wider",
        isCollapsed ? "justify-center" : "text-[0.9rem]",
        isActive 
          ? `${activeColor} font-bold` 
          : "text-[#E4E4E4] opacity-60 hover:opacity-100 hover:text-white"
      )}
    >
      <div className={cn("transition-transform duration-200", isCollapsed ? "scale-110" : "")}>{icon}</div>
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}
