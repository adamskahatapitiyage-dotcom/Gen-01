import React, { useState, useEffect, useRef } from 'react';
import { useLogs } from '../contexts/LogContext';
import type { LogEntry, LogLevel } from '../types';

const LogLevelIndicator: React.FC<{ level: LogLevel }> = ({ level }) => {
    const levelClasses: Record<LogLevel, string> = {
        INFO: 'bg-blue-500 text-blue-100',
        SUCCESS: 'bg-green-500 text-green-100',
        WARN: 'bg-yellow-500 text-yellow-100',
        ERROR: 'bg-red-500 text-red-100',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${levelClasses[level]}`}>
            {level}
        </span>
    );
};

const formatLogTimestamp = (isoString: string): string => {
    // FIX: The `fractionalSecondDigits` option is not standard in `toLocaleTimeString`.
    // Manually format the time to include milliseconds for cross-browser compatibility.
    const date = new Date(isoString);
    const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    const milliseconds = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${milliseconds}`;
};

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const ClipboardIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25H9a2.25 2.25 0 0 1-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
);


const LogPanel: React.FC = () => {
    const { logs, isLogPanelOpen, toggleLogPanel, clearLogs } = useLogs();
    const [isCopied, setIsCopied] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to the top (most recent log) when new logs are added
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = 0;
        }
    }, [logs]);
    
    const handleCopy = () => {
        const logText = logs
            .slice() // Create a copy to avoid reversing the state array
            .reverse() // Oldest to newest for copying
            .map(log => `${log.timestamp} [${log.level}] ${log.message}`)
            .join('\n');
        navigator.clipboard.writeText(logText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <>
            {isLogPanelOpen && <div className="fixed inset-0 bg-black/30 z-30" onClick={toggleLogPanel} aria-hidden="true"></div>}
            <div className={`fixed bottom-0 left-0 right-0 h-1/3 max-h-96 transform transition-transform duration-300 ease-in-out bg-slate-900 border-t border-slate-700 shadow-2xl z-40 flex flex-col ${isLogPanelOpen ? 'translate-y-0' : 'translate-y-full'}`}
                role="logdialog" aria-modal="true" aria-labelledby="log-panel-title">
                <header className="flex items-center justify-between p-3 border-b border-slate-800 flex-shrink-0">
                    <h2 id="log-panel-title" className="font-bold text-white">Application Logs</h2>
                    <div className="flex items-center gap-2">
                        <button onClick={handleCopy} title="Copy Logs" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors text-sm font-semibold w-20">{isCopied ? 'Copied!' : 'Copy'}</button>
                        <button onClick={clearLogs} title="Clear Logs" className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"><TrashIcon className="w-5 h-5" /></button>
                        <button onClick={toggleLogPanel} title="Close Logs" className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"><XIcon className="w-5 h-5" /></button>
                    </div>
                </header>
                <div ref={logContainerRef} className="flex-grow overflow-y-auto p-3 font-mono text-sm space-y-2">
                    {logs.length === 0 ? (
                        <p className="text-slate-500 text-center py-4">No log entries yet.</p>
                    ) : (
                        logs.map((log, index) => (
                            <div key={`${log.timestamp}-${index}`} className="flex items-start gap-3">
                                <span className="text-slate-500 flex-shrink-0">{formatLogTimestamp(log.timestamp)}</span>
                                <LogLevelIndicator level={log.level} />
                                <p className="text-slate-300 break-words whitespace-pre-wrap flex-grow">{log.message}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
};

export default LogPanel;