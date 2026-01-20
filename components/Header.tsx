import React from 'react';

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const TerminalIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L12 15.25l5.571-3M6.429 9.75 12 12l5.571-2.25" />
    </svg>
);

const ChatBubbleOvalLeftEllipsisIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.28 1.767.448 2.65.516V19.5a2.25 2.25 0 0 1-2.25 2.25H1.5a2.25 2.25 0 0 1-2.25-2.25V6A2.25 2.25 0 0 1 1.5 3.75h14.85c.343 0 .676.067 1 .192.261.129.516.28.756.445m-3.604-3.604 1.533-1.533A2.25 2.25 0 0 1 18 2.25h.75a2.25 2.25 0 0 1 2.25 2.25v.75a2.25 2.25 0 0 1-1.533 2.083L16.85 9.06m-1.5-1.5-.26.26M13.5 10.5h.008v.008h-.008V10.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm-4.5 0h.008v.008h-.008V10.5Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
    </svg>
);


const Header: React.FC<{ onToggleHistory: () => void; onToggleLogs: () => void; onToggleChatbot: () => void; }> = ({ onToggleHistory, onToggleLogs, onToggleChatbot }) => (
  <header className="bg-slate-950/75 backdrop-blur-lg sticky top-0 z-20 border-b border-slate-800">
    <div className="max-w-7xl mx-auto p-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <div className="text-2xl p-2 rounded-lg bg-gradient-to-br from-cyan-400 to-teal-500 font-black text-slate-900 shadow-lg">
          AR
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">AI Attribute Rule Generator</h1>
          <p className="text-sm text-slate-400">Powered by Gemini 2.5 Flash</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
         <button 
          onClick={onToggleHistory}
          className="p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label="Toggle generation history"
        >
          <HistoryIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={onToggleLogs}
          className="p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label="Toggle application logs"
        >
          <TerminalIcon className="w-6 h-6" />
        </button>
        <button 
          onClick={onToggleChatbot}
          className="p-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 focus:ring-offset-slate-950"
          aria-label="Toggle chatbot"
        >
          <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  </header>
);

export default Header;