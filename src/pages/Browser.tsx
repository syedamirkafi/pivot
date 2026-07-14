import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, ExternalLink } from 'lucide-react';

export function Browser() {
  const defaultUrl = 'https://www.linkedin.com/jobs';
  const [urlInput, setUrlInput] = useState(defaultUrl);
  const [currentUrl, setCurrentUrl] = useState(defaultUrl);
  const [key, setKey] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalUrl = urlInput.trim();
    if (!finalUrl) return;

    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      if (finalUrl.includes('.') && !finalUrl.includes(' ')) {
        finalUrl = 'https://' + finalUrl;
      } else {
        finalUrl = 'https://www.google.com/search?q=' + encodeURIComponent(finalUrl);
      }
    }
    setCurrentUrl(finalUrl);
    setUrlInput(finalUrl);
  };

  const handleReload = () => {
    setKey(prev => prev + 1);
  };

  const handleHome = () => {
    setCurrentUrl(defaultUrl);
    setUrlInput(defaultUrl);
  };

  const handleOpenExternal = () => {
    window.open(currentUrl, '_blank');
  };

  return (
    <div className="h-full flex flex-col bg-[#111113] border border-white/10 rounded-xl overflow-hidden">
      {/* Browser Toolbar */}
      <div className="flex items-center gap-2 p-3 border-b border-white/10 bg-[#1A1A1D]">
        <div className="flex items-center gap-1">
          <button 
            className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            disabled
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button 
            className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            disabled
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button 
            onClick={handleReload}
            className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button 
            onClick={handleHome}
            className="p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex items-center relative ml-2">
          <Search className="w-4 h-4 absolute left-3 text-gray-500" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="w-full bg-[#09090B] border border-white/10 rounded-md py-1.5 pl-9 pr-4 text-sm text-gray-200 focus:outline-none focus:border-[#FF4D00] transition-colors font-mono"
            placeholder="Enter URL or search"
          />
        </form>

        <button 
          onClick={handleOpenExternal}
          title="Open in new tab"
          className="ml-2 p-2 hover:bg-white/5 rounded-md text-gray-400 hover:text-white transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {/* Browser Content */}
      <div className="flex-1 bg-white relative">
        <iframe
          key={key}
          src={`/api/proxy?url=${encodeURIComponent(currentUrl)}`}
          className="w-full h-full border-none"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          title="Web Browser"
        />
      </div>
    </div>
  );
}
