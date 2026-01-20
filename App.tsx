import React, { useState, useCallback, useEffect } from 'react';
import { GoogleGenAI, Chat } from '@google/genai';
import Header from './components/Header';
import RuleGeneratorForm from './components/RuleGeneratorForm';
import RuleOutput from './components/RuleOutput';
import HistoryPanel from './components/HistoryPanel';
import WelcomeScreen from './components/WelcomeScreen'; // Import the new component
import ChatbotPanel from './components/ChatbotPanel'; // Import ChatbotPanel
import { generateAttributeRuleStreamed, generateRefinedRule, generateRuleFromImagesStreamed, generateRuleFromTextAndImagesStreamed, refineRuleStreamed, verifyRuleWithSamples, generateCategoryRuleStreamed } from './services/geminiService';
import type { GenerationPayload, RuleInputs, HistoryItem, TestResult, CategoryInputs } from './types';
import { useLogs } from './contexts/LogContext';
import LogPanel from './components/LogPanel';

const getInitialHistory = (): HistoryItem[] => {
  try {
    const storedHistory = localStorage.getItem('ruleGenerationHistory');
    if (storedHistory) {
      const parsedHistory = JSON.parse(storedHistory);
      if (Array.isArray(parsedHistory) && parsedHistory.length > 0) {
        // Add back the null chatSession property
        const restoredHistory = parsedHistory.map((item: Omit<HistoryItem, 'chatSession'>) => ({
          ...item,
          chatSession: null, // Chat session objects are not serializable, so they are not stored.
        }));
        return restoredHistory;
      }
    }
  } catch (e) {
    console.error("Failed to load history from localStorage", e);
  }
  // Return empty array if localStorage is empty or fails
  return [];
};


const App: React.FC = () => {
  const { addLog, toggleLogPanel } = useLogs();
  const [history, setHistory] = useState<HistoryItem[]>(getInitialHistory);
  const [selectedHistoryIndex, setSelectedHistoryIndex] = useState<number | null>(() => (history.length > 0 ? 0 : null));
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false); // New state for chatbot
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(history.length === 0);


  // State for rule verification/testing
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testError, setTestError] = useState<string>('');

  // Log initial state
  useEffect(() => {
    addLog('INFO', 'Application initialized.');
    if (history.length > 0) {
      addLog('INFO', `Loaded ${history.length} items from localStorage.`);
    }
  }, [addLog]); // This should only run once, addLog is stable


  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      // Don't store non-serializable chatSession objects
      const serializableHistory = history.map(({ chatSession, ...rest }) => rest);
      localStorage.setItem('ruleGenerationHistory', JSON.stringify(serializableHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
      addLog('ERROR', `Failed to save history to localStorage: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }, [history, addLog]);
  
  const handleGetStarted = () => {
    setShowWelcomeScreen(false);
    addLog('INFO', 'Welcome screen dismissed. Starting new session.');
  };

  const handleGenerate = useCallback(async (payload: GenerationPayload) => {
    setIsLoading(true);
    setError('');
    addLog('INFO', `Starting generation for '${payload.type}' mode.`);

    // Handle non-streaming 'refine' case separately
    if (payload.type === 'refine') {
        const tempId = crypto.randomUUID();
        const tempHistoryItem: HistoryItem = {
            id: tempId,
            inputs: { category: 'Refining Rule...', attributeName: 'AI is analyzing...', values: '' },
            rule: '', // Rule starts empty
            chatSession: null,
            createdAt: new Date().toISOString(),
        };
        setHistory(prev => [tempHistoryItem, ...prev]);
        setSelectedHistoryIndex(0);
        setTestResults(null);
        setTestError('');

        try {
            const { rule, inputs, chat } = await generateRefinedRule(payload.inputs);
            setHistory(prev => {
                const newHistory = [...prev];
                if (newHistory[0]?.id === tempId) {
                    newHistory[0] = { ...newHistory[0], id: crypto.randomUUID(), rule, inputs, chatSession: chat };
                    return newHistory;
                }
                return prev;
            });
            addLog('SUCCESS', 'Rule refinement successful.');
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(`Failed to generate rule: ${errorMessage}`);
            addLog('ERROR', `Refinement failed: ${errorMessage}`);
            console.error(err);
            setHistory(prev => prev.filter(item => item.id !== tempId));
            setSelectedHistoryIndex(null);
        } finally {
            setIsLoading(false);
        }
        return;
    }

    // Standard streaming logic for other types
    let inputs: RuleInputs;
    if (payload.type === 'text' || payload.type === 'text-and-image') {
      inputs = payload.inputs;
    } else if (payload.type === 'category') { // Handle new category type for history display
        inputs = { 
          category: payload.categoryInputs.categoryName, 
          attributeName: 'Category Rules', 
          values: payload.categoryInputs.categoryDescription.substring(0, 100) + (payload.categoryInputs.categoryDescription.length > 100 ? '...' : '')
        };
    } else { // 'image' type
      inputs = { category: 'Image-Based', attributeName: `OCR Result (${new Date().toLocaleTimeString()})`, values: 'N/A' };
    }
    
    const tempId = crypto.randomUUID();
    const tempHistoryItem: HistoryItem = {
      id: tempId,
      inputs,
      rule: '',
      chatSession: null,
      createdAt: new Date().toISOString(),
    };
    
    setHistory(prev => [tempHistoryItem, ...prev]);
    setSelectedHistoryIndex(0);
    setTestResults(null); // Clear previous test results
    setTestError('');

    const onChunk = (chunk: string) => {
      setHistory(prev => {
        const newHistory = [...prev];
        if (newHistory[0]?.id === tempId) {
          newHistory[0] = { ...newHistory[0], rule: newHistory[0].rule + chunk };
          return newHistory;
        }
        return prev;
      });
    };

    try {
      let finalRule: string;
      let chatSession: Chat | null = null;
      
      if (payload.type === 'text') {
        const result = await generateAttributeRuleStreamed(payload.inputs, onChunk);
        finalRule = result.rule;
        chatSession = result.chat;
      } else if (payload.type === 'text-and-image') {
        finalRule = await generateRuleFromTextAndImagesStreamed(payload.inputs, payload.images, onChunk);
      } else if (payload.type === 'image') { // 'image' type
        finalRule = await generateRuleFromImagesStreamed(payload.images, onChunk);
      } else if (payload.type === 'category') { // Handle new category type
        const result = await generateCategoryRuleStreamed(payload.categoryInputs, onChunk);
        finalRule = result.rule;
        chatSession = result.chat; 
      }
      else {
        throw new Error("Unknown payload type.");
      }

      setHistory(prev => {
        const newHistory = [...prev];
        if (newHistory[0]?.id === tempId) {
          newHistory[0] = { ...newHistory[0], id: crypto.randomUUID(), rule: finalRule, chatSession: chatSession };
          return newHistory;
        }
        return prev;
      });
      addLog('SUCCESS', 'Rule generation successful.');

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to generate rule: ${errorMessage}`);
      addLog('ERROR', `Generation failed: ${errorMessage}`);
      console.error(err);
      // Remove temporary item on error
      setHistory(prev => prev.filter(item => item.id !== tempId));
      setSelectedHistoryIndex(null);
    } finally {
      setIsLoading(false);
    }
  }, [addLog]);

  const handleRefine = useCallback(async (refinementPrompt: string) => {
    if (selectedHistoryIndex === null) return;

    const currentItem = history[selectedHistoryIndex];
    if (!currentItem || !currentItem.chatSession) {
      const msg = "This rule cannot be refined as it is an example or its session has expired. Please generate a new rule.";
      setError(msg);
      addLog('WARN', msg);
      return;
    }

    setIsRefining(true);
    setError('');
    setTestResults(null); // Clear test results when refining
    setTestError('');
    addLog('INFO', `Refining rule with prompt: "${refinementPrompt.substring(0, 50)}..."`);


    const originalRule = currentItem.rule;
    // Clear the rule to start streaming the new one
    setHistory(prev => {
      const newHistory = [...prev];
      newHistory[selectedHistoryIndex] = { ...newHistory[selectedHistoryIndex], rule: '' };
      return newHistory;
    });

    const onChunk = (chunk: string) => {
      setHistory(prev => {
        const newHistory = [...prev];
        const current = newHistory[selectedHistoryIndex];
        if (current) {
            newHistory[selectedHistoryIndex] = { ...current, rule: current.rule + chunk };
        }
        return newHistory;
      });
    };

    try {
      const refinedRuleText = await refineRuleStreamed(currentItem.chatSession, currentItem.inputs, refinementPrompt, originalRule, onChunk);
      // Final update to ensure the rule is the cleaned, final version
      setHistory(prev => {
        const newHistory = [...prev];
        if(newHistory[selectedHistoryIndex]) {
          newHistory[selectedHistoryIndex] = { ...newHistory[selectedHistoryIndex], rule: refinedRuleText };
        }
        return newHistory;
      });
      addLog('SUCCESS', 'Rule refinement successful.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown refinement error occurred.';
      setError(`Failed to refine rule: ${errorMessage}`);
      addLog('ERROR', `Refinement failed: ${errorMessage}`);
      console.error(err);
      // Restore original rule on error
      setHistory(prev => {
        const newHistory = [...prev];
        if(newHistory[selectedHistoryIndex]) {
            newHistory[selectedHistoryIndex] = { ...newHistory[selectedHistoryIndex], rule: originalRule };
        }
        return newHistory;
      });
    } finally {
      setIsRefining(false);
    }
  }, [history, selectedHistoryIndex, addLog]);
  
  const handleUpdateRule = (newRule: string) => {
    if (selectedHistoryIndex === null) return;
    addLog('INFO', `Rule at index ${selectedHistoryIndex} updated manually.`);
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[selectedHistoryIndex]) {
        newHistory[selectedHistoryIndex] = { ...newHistory[selectedHistoryIndex], rule: newRule };
      }
      return newHistory;
    });
  };

  const handleSetCompactRule = (compactRule: string) => {
    if (selectedHistoryIndex === null) return;
    addLog('INFO', 'Compact rule generated and cached.');
    setHistory(prev => {
      const newHistory = [...prev];
      if (newHistory[selectedHistoryIndex]) {
        newHistory[selectedHistoryIndex] = { ...newHistory[selectedHistoryIndex], compactRule };
      }
      return newHistory;
    });
  };

  const handleTestRule = useCallback(async (rule: string, samples: string) => {
    setIsTesting(true);
    setTestError('');
    setTestResults(null);
    addLog('INFO', 'Starting rule test with sample data.');
    try {
      const results = await verifyRuleWithSamples(rule, samples);
      setTestResults(results);
      addLog('SUCCESS', `Rule test completed with ${results.length} results.`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during testing.';
      setTestError(`Failed to test rule: ${errorMessage}`);
      addLog('ERROR', `Rule test failed: ${errorMessage}`);
      console.error(err);
    } finally {
      setIsTesting(false);
    }
  }, [addLog]);

  const handleSelectHistory = (index: number) => {
    setSelectedHistoryIndex(index);
    setError('');
    // Clear test results when switching items
    setTestResults(null);
    setTestError('');
    setIsHistoryPanelOpen(false); // Close panel on selection
    addLog('INFO', `Selected history item at index ${index}.`);
  };
  
  const handleDeleteHistoryItem = (indexToDelete: number) => {
    if (window.confirm("Are you sure you want to delete this history item?")) {
        addLog('WARN', `Deleted history item at index ${indexToDelete}.`);
        setHistory(prev => {
          const newHistory = prev.filter((_, index) => index !== indexToDelete);
          // If the last item is deleted, show the welcome screen again
          if (newHistory.length === 0) {
            setShowWelcomeScreen(true);
          }
          return newHistory;
        });
        
        // Adjust selection
        if (selectedHistoryIndex === indexToDelete) {
            setSelectedHistoryIndex(null); // Deselect if the active item is deleted
        } else if (selectedHistoryIndex !== null && selectedHistoryIndex > indexToDelete) {
            // If an item before the selected one is deleted, the index of the selected one shifts
            setSelectedHistoryIndex(prev => (prev !== null ? prev - 1 : null));
        }
    }
  };

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear all generation history? This cannot be undone.")) {
      addLog('WARN', 'Cleared all generation history.');
      setHistory([]);
      setSelectedHistoryIndex(null);
      // Clear test results as well
      setTestResults(null);
      setTestError('');
      setShowWelcomeScreen(true); // Show welcome screen after clearing all history
    }
  };

  const handleClearForm = () => {
    setSelectedHistoryIndex(null);
    // Clear test results when clearing form
    setTestResults(null);
    setTestError('');
    addLog('INFO', 'Form cleared and deselected active item.');
  };
  
  const toggleHistoryPanel = () => {
    setIsHistoryPanelOpen(prev => !prev);
    // Close chatbot if history opens
    if (!isHistoryPanelOpen && isChatbotOpen) {
      setIsChatbotOpen(false);
    }
  };

  const toggleChatbotPanel = () => {
    setIsChatbotOpen(prev => !prev);
    // Close history if chatbot opens
    if (!isChatbotOpen && isHistoryPanelOpen) {
      setIsHistoryPanelOpen(false);
    }
  };

  const selectedItem = selectedHistoryIndex !== null ? history[selectedHistoryIndex] : null;

  return (
    <div className="min-h-screen bg-slate-950 font-sans">
      <Header 
        onToggleHistory={toggleHistoryPanel} 
        onToggleLogs={toggleLogPanel} 
        onToggleChatbot={toggleChatbotPanel} // Pass the new toggle function
      />
      {showWelcomeScreen ? (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      ) : (
        <main className="max-w-7xl mx-auto p-4 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-[450px_1fr] gap-8 items-start">
            <RuleGeneratorForm 
              onGenerate={handleGenerate} 
              isLoading={isLoading}
              activeInputs={selectedItem?.inputs}
              onClearForm={handleClearForm}
            />
            <RuleOutput 
              item={selectedItem} 
              isLoading={isLoading} 
              isRefining={isRefining}
              error={error}
              onRefine={handleRefine}
              onUpdateRule={handleUpdateRule}
              onSetCompactRule={handleSetCompactRule}
              onTestRule={handleTestRule}
              testResults={testResults}
              isTesting={isTesting}
              testError={testError}
            />
          </div>
        </main>
      )}
      <HistoryPanel
        history={history}
        selectedIndex={selectedHistoryIndex}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
        isOpen={isHistoryPanelOpen}
        onClose={toggleHistoryPanel}
        onDelete={handleDeleteHistoryItem}
      />
      <ChatbotPanel
        isOpen={isChatbotOpen}
        onClose={toggleChatbotPanel}
      />
      <LogPanel />
    </div>
  );
};

export default App;