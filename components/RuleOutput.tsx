import React, { useState, useEffect } from 'react';
import type { HistoryItem, TestResult } from '../types';
import { exportRuleAsJson, generateCompactRule } from '../services/geminiService';
import { useLogs } from '../contexts/LogContext';


interface RuleOutputProps {
  item: HistoryItem | null;
  isLoading: boolean;
  isRefining: boolean;
  error: string;
  onRefine: (prompt: string) => void;
  onUpdateRule: (newRule: string) => void;
  onSetCompactRule: (compactRule: string) => void;
  onTestRule: (rule: string, samples: string) => void;
  testResults: TestResult[] | null;
  isTesting: boolean;
  testError: string;
}

interface RefinementZoneProps {
    onRefine: (prompt: string) => void;
    isRefining: boolean;
}

interface RuleVerificationProps {
  onTest: (samples: string) => void;
  results: TestResult[] | null;
  isTesting: boolean;
  error: string;
}

const funnyLoadingMessages = [
  "Consulting the digital oracle...",
  "Reticulating splines...",
  "Herding rogue pixels into formation...",
  "Waking up the AI's creative spirit...",
  "Translating binary into brilliance...",
  "Polishing the final characters...",
  "Asking the silicon brain nicely...",
  "Generating witty banter... I mean, rules...",
  "Consulting the rule whisperer...",
  "Negotiating with the logic council...",
  "Asking the digital oracle for if/else guidance...",
  "Untangling conditional spaghetti...",
  "Recruiting parentheses for extra clarity...",
  "Taming wild regular expressions...",
  "Teaching rules some manners...",
  "Convincing AND & OR to get along...",
  "Drafting rules with invisible ink...",
  "Checking if these rules are even legal...",
  "Summoning the guardians of syntax...",
  "Training rules not to contradict themselves...",
  "Balancing the scales of logic...",
  "Sharpening the edges of conditions...",
  "Whispering sweet nothings to operators...",
  "Reassuring rules they won’t be broken...",
  "Conducting a séance with Boolean spirits...",
  "Asking 'what if' one too many times...",
  "Polishing up the rulebook...",
  "Brewing conditional potions...",
];

const CheckIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
);

const ClipboardIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a2.25 2.25 0 0 1-2.25 2.25H9a2.25 2.25 0 0 1-2.25-2.25v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
    </svg>
);

const SparklesIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const DownloadIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
);

const PencilIcon: React.FC<{ className: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
);

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const XCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);


const parseRuleToJsx = (text: string): React.ReactNode[] => {
    const lines = text.split('\n');
    return lines.map((line, index) => {
        const trimmedLine = line.trim();
        const headerMatch = trimmedLine.match(/^### (.*)/);
        if (headerMatch) {
            return (
                <h3 key={index} className="text-lg font-bold mt-6 mb-3 text-cyan-300 flex items-center gap-2">
                    {headerMatch[1].replace(/\*\*/g, '')}
                </h3>
            );
        }

        if (trimmedLine.startsWith('* ✅ **Tag when**:')) {
            return <li key={index} className="mt-3"><strong className="font-semibold text-green-400">✅ Tag when:</strong><span className="text-slate-300">{line.substring(line.indexOf(':') + 1)}</span></li>;
        }
        if (trimmedLine.startsWith('* ❌ **Do not tag when**:')) {
            return <li key={index} className="mt-3"><strong className="font-semibold text-red-400">❌ Do not tag when:</strong><span className="text-slate-300">{line.substring(line.indexOf(':') + 1)}</span></li>;
        }
        if (trimmedLine.startsWith('* 🆚 **Confusable with**:')) {
            return <li key={index} className="mt-3"><strong className="font-semibold text-amber-400">🆚 Confusable with:</strong><span className="text-slate-300">{line.substring(line.indexOf(':') + 1)}</span></li>;
        }
        
        const nestedListItemMatch = line.match(/^\s{2,}\* (.*)/);
        if (nestedListItemMatch) {
            return <li key={index} className="ml-10 list-['-_'] text-slate-400">{nestedListItemMatch[1]}</li>;
        }
        
        const mainListItemMatch = line.match(/^\* \*\*(.*?)\*\*:\s?(.*)/);
        if (mainListItemMatch) {
            return (
                <li key={index} className="mt-3">
                    <strong className="font-semibold text-teal-300">{mainListItemMatch[1]}:</strong>
                    <span className="text-slate-300"> {mainListItemMatch[2]}</span>
                </li>
            );
        }
        
        const listItemMatch = line.match(/^\* (.*)/);
        if (listItemMatch) {
            return <li key={index} className="mt-1 ml-5 list-disc text-slate-300">{listItemMatch[1]}</li>;
        }
        
        if (line.trim() === '') {
            return <br key={index} />;
        }
        return <p key={index} className="text-slate-300 my-2">{line}</p>;
    });
};

const parseCompactRuleToJsx = (text: string): React.ReactNode => {
    // Simple parser for the compact view's markdown
    const lines = text.split('\n').filter(line => line.trim() !== '');
    return (
        <div className="prose prose-invert prose-sm max-w-none">
            {lines.map((line, index) => {
                const trimmedLine = line.trim();
                if (trimmedLine.startsWith('* ') || trimmedLine.startsWith('- ')) {
                    return <li key={index} className="ml-5 list-disc text-slate-300">{trimmedLine.substring(2)}</li>;
                }
                if (index === 0) { // First line as a summary paragraph
                    return <p key={index} className="text-slate-200 font-semibold">{trimmedLine}</p>;
                }
                return <p key={index} className="text-slate-300 my-1">{trimmedLine}</p>;
            })}
        </div>
    );
};


const FunnyLoadingIndicator: React.FC<{ message: string }> = ({ message }) => (
    <div className="text-center text-slate-400 py-10 flex flex-col items-center justify-center h-full">
        <svg className="animate-spin h-8 w-8 text-cyan-400 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="font-semibold text-slate-300">{message}</p>
    </div>
);


const RuleDisplay: React.FC<{ rule: string }> = ({ rule }) => (
    <div className="prose prose-invert prose-sm max-w-none">{parseRuleToJsx(rule)}</div>
);


const RefinementZone: React.FC<RefinementZoneProps> = ({ onRefine, isRefining }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onRefine(prompt);
        setPrompt('');
    };

    return (
        <div className="mt-8 border-t border-slate-800 pt-6">
            <h4 className="text-md font-semibold text-white mb-3">Refine Rule</h4>
            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="e.g., Make the definition for 'Sneaker' stricter, add 'Clogs' as a value..."
                    rows={3}
                    className="block w-full bg-slate-800 border border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50 transition-all"
                    disabled={isRefining}
                />
                <button
                    type="submit"
                    disabled={isRefining || !prompt.trim()}
                    className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-white bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {isRefining ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            Refining...
                        </>
                    ) : 'Refine Rule'}
                </button>
            </form>
        </div>
    )
}

const RuleVerification: React.FC<RuleVerificationProps> = ({ onTest, results, isTesting, error }) => {
  const [samples, setSamples] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTest(samples);
  };

  return (
    <div className="mt-6 border-t border-slate-800 pt-6">
      <h4 className="text-md font-semibold text-white mb-3">Test Rule</h4>
      <p className="text-sm text-slate-400 mb-4">
        Enter sample product titles or descriptions (one per line) to see how the rule would apply.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={samples}
          onChange={(e) => setSamples(e.target.value)}
          placeholder="e.g., Men's Classic Leather Sneaker&#10;Women's High-Heeled Ankle Boot&#10;Unisex Beach Flip-Flop Sandal"
          rows={5}
          className="block w-full bg-slate-800 border border-slate-700 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 sm:text-sm text-slate-200 placeholder-slate-500 disabled:opacity-50 transition-all"
          disabled={isTesting}
          aria-label="Sample data for rule testing"
        />
        <button
          type="submit"
          disabled={isTesting || !samples.trim()}
          className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md shadow-sm text-slate-900 bg-teal-400 hover:bg-teal-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-400 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isTesting ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-slate-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Testing...
            </>
          ) : 'Run Test'}
        </button>
      </form>
      
      {error && (
        <div className="mt-4 text-center text-red-400 bg-red-900/50 p-3 rounded-lg text-sm border border-red-800">
            <p className="font-bold">Test Failed</p>
            <p className="mt-1">{error}</p>
        </div>
      )}

      {results && results.length > 0 && (
        <div className="mt-6">
            <h5 className="text-sm font-semibold text-slate-300 mb-3">Test Results</h5>
            <ul className="space-y-3">
                {results.map((item, index) => (
                    <li key={index} className="bg-slate-800/70 p-4 rounded-md border border-slate-700">
                        <div className="flex items-start gap-3">
                            {item.result === 'pass' ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"/>
                            ) : (
                                <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"/>
                            )}
                            <div>
                                <p className="font-mono text-sm text-slate-300 break-all">{item.sample}</p>
                                <p className={`mt-1 text-xs ${item.result === 'pass' ? 'text-green-400' : 'text-red-400'}`}>
                                    <span className="font-bold uppercase">{item.result}: </span>
                                    <span className="text-slate-400">{item.reason}</span>
                                </p>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
      )}
    </div>
  );
};


const EmptyState = () => (
    <div className="text-center text-slate-500 py-10 flex flex-col items-center justify-center h-full space-y-6">
        <SparklesIcon className="w-12 h-12 text-slate-700" />
        <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-200">Ready to Build Your First Rule?</h3>
            <p className="text-sm max-w-xs mx-auto">Fill in the details, add optional images, and let the AI generate a detailed tagging rule for you.</p>
        </div>
        <ul className="text-sm space-y-2 text-left bg-slate-800 p-4 rounded-lg border border-slate-700">
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 bg-slate-700 text-cyan-400 font-bold rounded-full w-6 h-6 flex items-center justify-center">1</span>
            <span>Fill in the required fields.</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 bg-slate-700 text-cyan-400 font-bold rounded-full w-6 h-6 flex items-center justify-center">2</span>
            <span>Add images for context (optional).</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="flex-shrink-0 bg-slate-700 text-cyan-400 font-bold rounded-full w-6 h-6 flex items-center justify-center">3</span>
            <span>Generate your tagging rule.</span>
          </li>
        </ul>
    </div>
);

const RuleOutput: React.FC<RuleOutputProps> = ({ item, isLoading, isRefining, error, onRefine, onUpdateRule, onSetCompactRule, onTestRule, testResults, isTesting, testError }) => {
    const { addLog } = useLogs();
    const [isCopied, setIsCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editedRule, setEditedRule] = useState('');
    
    const [viewMode, setViewMode] = useState<'verbose' | 'compact'>('verbose');
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summarizeError, setSummarizeError] = useState('');

    useEffect(() => {
        // When the selected item changes, exit edit mode and reset to verbose view.
        setIsEditing(false);
        setViewMode('verbose');
        setSummarizeError('');
    }, [item]);

    useEffect(() => {
        if (isLoading || isRefining) {
            setLoadingMessage(funnyLoadingMessages[Math.floor(Math.random() * funnyLoadingMessages.length)]);
        }
    }, [isLoading, isRefining]);
    
    useEffect(() => {
        if(isCopied) {
            const timer = setTimeout(() => setIsCopied(false), 2000);
            return () => clearTimeout(timer);
        }
    }, [isCopied]);

    const handleCopy = () => {
        if (item?.rule) {
            navigator.clipboard.writeText(item.rule);
            setIsCopied(true);
        }
    };
    
    const handleExport = async () => {
        if (!item?.rule) return;
        setIsExporting(true);
        addLog('INFO', `Exporting rule for "${item.inputs.attributeName}" as JSON.`);
        try {
            const jsonString = await exportRuleAsJson(item.rule);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const safeFilename = (item.inputs.attributeName || 'rule').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.href = url;
            a.download = `${safeFilename}_${new Date().getTime()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addLog('SUCCESS', 'Rule exported and download triggered successfully.');
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred';
            alert(`Export failed: ${message}`);
            addLog('ERROR', `Export failed: ${message}`);
            console.error("Export error:", e);
        } finally {
            setIsExporting(false);
        }
    };
    
    const handleEdit = () => {
        if (item?.rule) {
            setEditedRule(item.rule);
            setIsEditing(true);
        }
    };
    
    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedRule('');
    };
    
    const handleSaveEdit = () => {
        onUpdateRule(editedRule);
        setIsEditing(false);
    };

    const handleTest = (samples: string) => {
        if (item?.rule) {
            onTestRule(item.rule, samples);
        }
    };
    
    const handleToggleView = async (mode: 'verbose' | 'compact') => {
        if (mode === viewMode) return;
        
        setViewMode(mode);

        if (mode === 'compact' && item && !item.compactRule && !isSummarizing) {
            setIsSummarizing(true);
            setSummarizeError('');
            addLog('INFO', 'Generating compact rule summary...');
            try {
                const summary = await generateCompactRule(item.rule);
                onSetCompactRule(summary);
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to generate summary.';
                setSummarizeError(errorMessage);
                addLog('ERROR', `Failed to generate compact rule: ${errorMessage}`);
                // On error, switch back to verbose view so user isn't stuck on a failed compact view
                setViewMode('verbose');
            } finally {
                setIsSummarizing(false);
            }
        }
    };

    const renderContent = () => {
        if (isLoading || isRefining) {
            return <FunnyLoadingIndicator message={loadingMessage} />;
        }
        if (error) {
            return (
                <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg border border-red-800">
                    <p className="font-bold">An Error Occurred</p>
                    <p className="text-sm mt-1">{error}</p>
                </div>
            );
        }
        
        if (isEditing) {
            return (
                <textarea
                    value={editedRule}
                    onChange={(e) => setEditedRule(e.target.value)}
                    className="w-full h-[60vh] bg-slate-900 border border-cyan-500 rounded-md p-4 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    aria-label="Rule editor"
                />
            );
        }
        
        if (item?.rule) {
            if (viewMode === 'compact') {
                if (isSummarizing) {
                    return <FunnyLoadingIndicator message="Condensing wisdom..." />;
                }
                if (summarizeError) {
                    return (
                        <div className="text-center text-red-400 bg-red-900/50 p-4 rounded-lg border border-red-800">
                            <p className="font-bold">Could not generate summary</p>
                            <p className="text-sm mt-1">{summarizeError}</p>
                        </div>
                    );
                }
                if (item.compactRule) {
                    return parseCompactRuleToJsx(item.compactRule);
                }
                 // Fallback while waiting for first fetch
                return <FunnyLoadingIndicator message="Preparing summary..." />;
            }
            
            // Verbose View
             return (
                <>
                    <RuleDisplay rule={item.rule} />
                    {item.chatSession && (
                        <RefinementZone onRefine={onRefine} isRefining={isRefining} />
                    )}
                    <RuleVerification 
                        onTest={handleTest}
                        results={testResults}
                        isTesting={isTesting}
                        error={testError}
                    />
                </>
            );
        }
        return <EmptyState />;
    };

    return (
        <div className="bg-slate-900/50 p-6 rounded-lg border border-slate-800 min-h-[300px] relative shadow-2xl shadow-slate-950/50">
            {item?.rule && !isLoading && !isRefining && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSaveEdit}
                                className="px-4 py-1.5 text-sm rounded-md bg-cyan-600 hover:bg-cyan-700 text-white transition-colors font-semibold"
                                aria-label="Save changes"
                                title="Save"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="px-4 py-1.5 text-sm rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors"
                                aria-label="Cancel editing"
                                title="Cancel"
                            >
                                Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <div className="bg-slate-800 p-1 rounded-md flex items-center">
                                <button onClick={() => handleToggleView('verbose')} className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === 'verbose' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-700/50'}`} aria-pressed={viewMode === 'verbose'}>
                                    Verbose
                                </button>
                                <button onClick={() => handleToggleView('compact')} className={`px-3 py-1 text-xs font-semibold rounded ${viewMode === 'compact' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:bg-slate-700/50'}`} aria-pressed={viewMode === 'compact'}>
                                    Compact
                                </button>
                            </div>
                            <button
                                onClick={handleEdit}
                                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                aria-label="Edit rule"
                                title="Edit Rule"
                            >
                                <PencilIcon className="w-5 h-5" />
                            </button>
                             <button 
                                onClick={handleExport}
                                disabled={isExporting}
                                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-wait"
                                aria-label="Export as JSON"
                                title="Export as JSON"
                            >
                                {isExporting 
                                    ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    : <DownloadIcon className="w-5 h-5" />
                                }
                            </button>
                            <button 
                                onClick={handleCopy}
                                className="p-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                                aria-label="Copy rule to clipboard"
                                title="Copy to Clipboard"
                            >
                                {isCopied ? <CheckIcon className="w-5 h-5 text-green-400" /> : <ClipboardIcon className="w-5 h-5" />}
                            </button>
                        </>
                    )}
                </div>
            )}
            <div className="pt-8">
              {renderContent()}
            </div>
        </div>
    );
};

export default RuleOutput;