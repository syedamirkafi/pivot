import React, { useState } from 'react';
import { Save, X } from 'lucide-react';

interface ResumeEditorProps {
  initialContent: string;
  onSave: (content: string) => void;
  onClose: () => void;
}

export function ResumeEditor({ initialContent, onSave, onClose }: ResumeEditorProps) {
  const [content, setContent] = useState(initialContent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-[#111113] border border-white/10 p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-mono text-lg font-bold text-[#FF4D00]">Edit Master CV</h3>
          <button onClick={onClose} className="hover:text-white text-gray-400">
            <X className="w-6 h-6" />
          </button>
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-80 bg-black/50 border border-white/20 p-6 font-sans text-base leading-relaxed text-[#E4E4E4] outline-none focus:border-[#FF4D00] rounded-sm resize-none whitespace-pre-wrap"
        />
        <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-sm">
          <p className="text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-2">Editing Hints</p>
          <ul className="text-[11px] text-gray-300 font-sans space-y-1">
            <li>• Use <span className="font-mono text-[#FF4D00]">##</span> at the start of a line to create a Header.</li>
            <li>• Use <span className="font-mono text-[#FF4D00]">-</span> or <span className="font-mono text-[#FF4D00]">•</span> for bullet points.</li>
            <li>• Use <span className="font-mono text-[#FF4D00]">**text**</span> for bold text.</li>
            <li>• Use <span className="font-mono text-[#FF4D00]">*text*</span> for italic text.</li>
            <li>• Use <span className="font-mono text-[#FF4D00]">---</span> for a horizontal line.</li>
            <li>• Text is saved exactly as formatted.</li>
          </ul>
        </div>
        <div className="flex justify-end gap-4 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-mono text-gray-400 hover:text-white">Cancel</button>
          <button onClick={() => onSave(content)} className="flex items-center gap-2 px-4 py-2 text-sm font-mono bg-[#FF4D00] text-white hover:bg-[#FF4D00]/80">
            <Save className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
