import React, { useState, useMemo } from 'react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onClear: () => void;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (index: number) => void;
}

const formatHistoryTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateToCompare = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const timeFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    const timeStr = date.toLocaleTimeString('en-US', timeFormat);

    if (dateToCompare.getTime() === today.getTime()) {
      return `Today, ${timeStr}`;
    }
    if (dateToCompare.getTime() === yesterday.getTime()) {
      return `Yesterday, ${timeStr}`;
    }
    const dateFormat: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', dateFormat);
};

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
    </svg>
);


const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, selectedIndex, onSelect, onClear, isOpen, onClose, onDelete }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) {
      // Map to include original index for consistent selection logic
      return history.map((item, index) => ({ item, originalIndex: index }));
    }
    return history
      .map((item, index) => ({ item, originalIndex: index }))
      .filter(({ item }) =>
        item.inputs.category.toLowerCase().includes(query) ||
        item.inputs.attributeName.toLowerCase().includes(query)
      );
  }, [history, searchQuery]);


  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
            className="fixed inset-0 bg-black/60 z-20 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
        ></div>
      )}

      {/* Panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-full max-w-sm transform transition-transform duration-300 ease-in-out bg-slate-900 border-l border-slate-800 z-30 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-panel-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 id="history-panel-title" className="text-lg font-bold text-white">Generation History</h2>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
                <button 
                    onClick={onClear} 
                    className="text-slate-400 hover:text-red-400 transition-colors p-1"
                    aria-label="Clear all history"
                    title="Clear all history"
                >
                    <TrashIcon className="w-5 h-5" />
                </button>
            )}
            <button 
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
              aria-label="Close history panel"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-slate-800">
            <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <SearchIcon className="w-5 h-5 text-slate-500" />
                </span>
                <input
                    type="text"
                    placeholder="Search by category or attribute..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    aria-label="Search history"
                />
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No history yet.</p>
          ) : filteredHistory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">No results found for "{searchQuery}".</p>
          ) : (
            filteredHistory.map(({ item, originalIndex }) => (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelect(originalIndex)}
                  className={`w-full text-left p-3 rounded-md transition-colors border-l-4 ${
                    selectedIndex === originalIndex
                      ? 'bg-slate-800 border-cyan-500'
                      : 'bg-slate-800/50 border-transparent hover:bg-slate-800'
                  }`}
                >
                  <p className="font-semibold text-slate-200 truncate">{item.inputs.category}</p>
                  <p className="text-sm text-slate-400 truncate pr-6">{item.inputs.attributeName}</p>
                  <p className="text-xs text-slate-500 mt-1">{formatHistoryTimestamp(item.createdAt)}</p>
                </button>
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(originalIndex);
                    }}
                    className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 rounded-full text-slate-500 hover:text-red-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Delete item"
                    title="Delete item"
                >
                    <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default HistoryPanel;