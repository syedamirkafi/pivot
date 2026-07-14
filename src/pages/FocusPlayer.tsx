import React, { useState, useEffect } from 'react';
import { Music, Play, Sparkles, Clock, RotateCcw, AlertCircle, HelpCircle } from 'lucide-react';

interface PlaylistOption {
  id: string;
  name: string;
  description: string;
  embedUrl: string;
  vibeColor: string;
  badge: string;
}

const PLAYLISTS: PlaylistOption[] = [
  {
    id: 'lofi',
    name: 'Lofi Focus Beats',
    description: 'Gentle, dusty vinyl loops for comfortable concentration.',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWWQRwui0ExPn?utm_source=generator&theme=0',
    vibeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:border-amber-500/60',
    badge: 'Chill Loop'
  },
  {
    id: 'synthwave',
    name: 'Synthwave Radio (YouTube Live)',
    description: 'Active 24/7 continuous stream of retro-futuristic electronic beats, completely free.',
    embedUrl: 'https://www.youtube.com/embed/4xDzrJKXOOY?autoplay=0&mute=0&controls=1',
    vibeColor: 'border-pink-500/30 text-pink-400 bg-pink-500/5 hover:border-pink-500/60',
    badge: 'Live YouTube'
  },
  {
    id: 'deep-focus',
    name: 'Deep Focus Flow',
    description: 'Atmospheric ambient soundscapes to drown out distractions.',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DWZeKFB6uST9m?utm_source=generator&theme=0',
    vibeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-500/60',
    badge: 'Drown Noise'
  },
  {
    id: 'peaceful-piano',
    name: 'Peaceful Piano',
    description: 'Tranquil piano melodies to help you slow down, breathe, and focus.',
    embedUrl: 'https://open.spotify.com/embed/playlist/37i9dQZF1DX4sWSpwq3LiO?utm_source=generator&theme=0',
    vibeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-500/60',
    badge: 'Soft Keys'
  }
];

export function FocusPlayer() {
  const [selectedPlaylist, setSelectedPlaylist] = useState<PlaylistOption>(PLAYLISTS[0]);
  
  // Pomodoro timer state
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState<'Focus' | 'Break'>('Focus');

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer finished
            if (mode === 'Focus') {
              setMode('Break');
              setMinutes(5);
            } else {
              setMode('Focus');
              setMinutes(25);
            }
            setIsActive(false);
            // Play notification sound if possible
            try {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const oscillator = audioCtx.createOscillator();
              oscillator.type = 'sine';
              oscillator.frequency.setValueAtTime(440, audioCtx.currentTime);
              oscillator.connect(audioCtx.destination);
              oscillator.start();
              oscillator.stop(audioCtx.currentTime + 0.5);
            } catch (e) {
              // Ignore audio context constraints
            }
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        } else {
          setSeconds(seconds - 1);
        }
      }, 1000);
    } else if (interval) {
      clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds, minutes, mode]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === 'Focus') {
      setMinutes(25);
    } else {
      setMinutes(5);
    }
    setSeconds(0);
  };

  const setTimerMode = (newMode: 'Focus' | 'Break') => {
    setIsActive(false);
    setMode(newMode);
    setMinutes(newMode === 'Focus' ? 25 : 5);
    setSeconds(0);
  };

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in text-[#E4E4E4]">
      {/* Header */}
      <div className="shrink-0 flex justify-between items-center border-b border-white/10 pb-6">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#1DB954] flex items-center gap-3">
            <Music className="w-6 h-6 text-[#1DB954]" /> SPOTIFY
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#1DB954]/10 border border-[#1DB954]/20 px-3 py-1.5 text-xs font-mono text-[#1DB954]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> NO SETUP REQUIRED
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
        
        {/* Left 5 Columns: Curated Playlists & Pomodoro Widget */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-1">
          
          {/* Vibe Presets Selector */}
          <div className="bg-[#111113] border border-white/10 p-5 rounded-none">
            <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white/60 mb-4 flex items-center gap-2">
              <span>🎛️</span> CHOOSE YOUR FOCUS VIBE
            </h2>
            <div className="flex flex-col gap-3">
              {PLAYLISTS.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => setSelectedPlaylist(playlist)}
                  className={`w-full text-left p-4 rounded-none border transition-all cursor-pointer flex flex-col gap-1.5 ${
                    selectedPlaylist.id === playlist.id
                      ? 'border-[#1DB954] bg-[#1DB954]/5 ring-1 ring-[#1DB954]/30'
                      : playlist.vibeColor
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono font-bold text-sm text-white">{playlist.name}</span>
                    <span className="font-mono text-[0.6rem] uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 text-white/50 rounded-none">
                      {playlist.badge}
                    </span>
                  </div>
                  <p className="text-xs text-white/60 line-clamp-2 leading-relaxed">
                    {playlist.description}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Integrated Pomodoro Widget */}
          <div className="bg-[#111113] border border-white/10 p-5 rounded-none flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="font-mono text-xs uppercase tracking-[0.15em] text-white/60 flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1DB954]" /> FOCUS TIMER
              </h2>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setTimerMode('Focus')}
                  className={`px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider rounded-none border ${
                    mode === 'Focus'
                      ? 'bg-[#1DB954] border-[#1DB954] text-white'
                      : 'border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  Work (25m)
                </button>
                <button
                  onClick={() => setTimerMode('Break')}
                  className={`px-3 py-1 font-mono text-[0.65rem] uppercase tracking-wider rounded-none border ${
                    mode === 'Break'
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-white/10 hover:border-white/20 text-white/60'
                  }`}
                >
                  Break (5m)
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center py-6 bg-black/20 border border-white/5 rounded-none">
              <div className="font-mono text-5xl font-bold tracking-tight text-white mb-2">
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </div>
              <div className="font-mono text-[0.65rem] uppercase tracking-[0.2em] opacity-40 mb-5">
                {mode === 'Focus' ? 'Deep Work Session' : 'Relax & Recharge'}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={toggleTimer}
                  className="px-6 py-2 bg-white text-black hover:bg-[#1DB954] hover:text-white transition-colors text-xs font-mono font-bold uppercase tracking-wider rounded-none cursor-pointer"
                >
                  {isActive ? 'Pause' : 'Start Timer'}
                </button>
                <button
                  onClick={resetTimer}
                  className="p-2 border border-white/10 hover:border-white/20 hover:text-white transition-colors rounded-none text-white/60 cursor-pointer"
                  title="Reset"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right 7 Columns: Immersive Spotify Player Panel */}
        <div className="lg:col-span-7 flex flex-col bg-[#111113] border border-white/10 rounded-none p-5 overflow-hidden">
          <div className="flex items-center justify-between mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 bg-[#1DB954] animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-widest text-[#1DB954] font-bold">NATIVE SPOTIFY WIDGET</span>
            </div>
            <div className="font-mono text-[0.65rem] text-white/40 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" /> Web Playback Enabled
            </div>
          </div>

          <div className="flex-1 relative bg-black/40 border border-white/5 rounded-none overflow-hidden min-h-[360px]">
            {/* Embedded Native Spotify Player */}
            <iframe
              src={selectedPlaylist.embedUrl}
              className="absolute inset-0 w-full h-full"
              frameBorder="0"
              allowFullScreen={true}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture; accelerometer; gyroscope; web-share"
              loading="lazy"
            />
          </div>

          <div className="mt-4 p-4 bg-white/5 border border-white/5 rounded-none flex gap-3 items-start shrink-0">
            <HelpCircle className="w-5 h-5 text-[#1DB954] shrink-0 mt-0.5" />
            <div className="text-xs text-white/60 leading-relaxed">
              <span className="text-white font-mono font-bold block mb-0.5">💡 PRO-TIP</span>
              You can listen to Spotify previews directly without logging in. To listen to full-length tracks, simply sign in to your Spotify account in your browser or through the player's native prompt.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
