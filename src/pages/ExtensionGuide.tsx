import React from 'react';
import { Download, CheckCircle, BookOpen, Sparkles } from 'lucide-react';

export function ExtensionGuide() {
  return (
    <div className="space-y-8 animate-fade-in text-[#E4E4E4] max-w-5xl mx-auto">
      <header className="flex justify-between items-center border-b border-white/10 pb-6 mb-8">
        <div>
          <h1 className="text-2xl font-mono font-bold tracking-tight text-[#3B82F6] flex items-center gap-3">
            <BookOpen className="w-6 h-6 text-[#3B82F6]" /> CHROME EXTENSION
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-3 py-1.5 text-xs font-mono text-[#3B82F6]">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> COMPANION UTILITY
        </div>
      </header>

      <div className="border border-white/10 bg-[#111113] p-8 space-y-8">
        <h3 className="font-mono font-bold text-lg text-[#FF4D00]">Installation Instructions</h3>
        <ol className="list-decimal list-inside space-y-4 text-[#E4E4E4] text-sm leading-relaxed font-mono">
          <li>Open the AI Studio file explorer (left panel).</li>
          <li>Navigate to <code className="bg-white/10 px-2 py-1 text-xs text-[#FF4D00]">public/chrome-extension/</code>.</li>
          <li>Save the three key files (<code className="bg-white/10 px-2 py-1 text-xs text-[#FF4D00]">manifest.json</code>, <code className="bg-white/10 px-2 py-1 text-xs text-[#FF4D00]">popup.html</code>, <code className="bg-white/10 px-2 py-1 text-xs text-[#FF4D00]">popup.js</code>) into a folder on your computer named <span className="text-white">"CareerOS Scraper"</span>.</li>
          <li>Open Google Chrome and navigate to <code className="bg-[#FF4D00]/20 text-[#FF4D00] px-2 py-1 text-xs font-bold">chrome://extensions/</code>.</li>
          <li>Enable the <strong className="text-white">Developer mode</strong> toggle switch in the upper right.</li>
          <li>Click <strong className="text-white">Load unpacked</strong> in the top left corner.</li>
          <li>Select the <span className="text-white">"CareerOS Scraper"</span> folder from your computer.</li>
        </ol>

        <div className="border border-blue-500/30 bg-blue-500/10 p-6">
          <h4 className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-blue-400 mb-4 flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> Operational Workflow
          </h4>
          <p className="text-[#E4E4E4] text-sm leading-relaxed font-mono">
            While visiting any LinkedIn or Indeed job posting, click the puzzle piece icon in your Chrome toolbar, choose the <span className="text-white">CareerOS Scraper</span>, and press <strong>"Scrape Job Description"</strong>. The content will be extracted and copied onto your clipboard automatically, fully prepared for pasting directly into the JD Match Engine!
          </p>
        </div>
      </div>
    </div>
  );
}
