import React, { createContext, useState, useCallback, ReactNode, useContext } from 'react';
import type { LogEntry, LogLevel } from '../types';

interface LogContextType {
  logs: LogEntry[];
  isLogPanelOpen: boolean;
  addLog: (level: LogLevel, message: string) => void;
  toggleLogPanel: () => void;
  clearLogs: () => void;
}

const LogContext = createContext<LogContextType | undefined>(undefined);

export const useLogs = (): LogContextType => {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
};

export const LogProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLogPanelOpen, setIsLogPanelOpen] = useState(false);

  const addLog = useCallback((level: LogLevel, message: string) => {
    const newLog: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
    };
    // Keep the log history from getting too large
    setLogs(prevLogs => [newLog, ...prevLogs].slice(0, 200));
  }, []);

  const toggleLogPanel = useCallback(() => {
    setIsLogPanelOpen(prev => !prev);
  }, []);
  
  const clearLogs = useCallback(() => {
      if(window.confirm("Are you sure you want to clear the logs?")) {
        setLogs([]);
        addLog('WARN', 'Logs cleared.');
      }
  }, [addLog]);

  const value = { logs, isLogPanelOpen, addLog, toggleLogPanel, clearLogs };

  return (
    <LogContext.Provider value={value}>
      {children}
    </LogContext.Provider>
  );
};
