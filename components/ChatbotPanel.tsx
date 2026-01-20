import React, { useState, useEffect, useRef } from 'react';
import { useLogs } from '../contexts/LogContext';
import { sendMessageToChatbot } from '../services/geminiService';
import type { ChatMessage } from '../types';

interface ChatbotPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
);

const SendIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 0 0 1 21.485 12 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
    </svg>
);

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
);

const ChatbotPanel: React.FC<ChatbotPanelProps> = ({ isOpen, onClose }) => {
  const { addLog } = useLogs();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    setError('');
    setIsSending(true);
    addLog('INFO', `User sent message to chatbot: "${inputMessage.substring(0, 50)}..."`);

    const userMessage: ChatMessage = { role: 'user', parts: [{ text: inputMessage }] };
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    let modelResponseText = '';
    const onChunk = (chunk: string) => {
      modelResponseText += chunk;
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];
        if (lastMessage?.role === 'model') {
          return prev.map((msg, idx) =>
            idx === prev.length - 1 ? { ...msg, parts: [{ text: modelResponseText }] } : msg
          );
        } else {
          // If the last message was user's, start a new model message
          return [...prev, { role: 'model', parts: [{ text: modelResponseText }] }];
        }
      });
    };

    try {
      const currentHistory = [...messages, userMessage]; // Include current user message for Gemini context
      const { fullResponse } = await sendMessageToChatbot(currentHistory, inputMessage, onChunk);
      
      // Ensure final state reflects the complete response
      setMessages(prev => {
        const updatedHistory = [...prev];
        const lastModelIndex = updatedHistory.findIndex(msg => msg.role === 'model' && msg.parts[0].text === modelResponseText);
        if (lastModelIndex !== -1) {
          updatedHistory[lastModelIndex] = { ...updatedHistory[lastModelIndex], parts: [{ text: fullResponse }] };
        } else {
            // Should not happen if onChunk is correctly adding, but as a fallback
            updatedHistory.push({ role: 'model', parts: [{ text: fullResponse }] });
        }
        return updatedHistory;
      });

      addLog('SUCCESS', 'Chatbot responded successfully.');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown chat error occurred.';
      setError(errorMessage);
      addLog('ERROR', `Chatbot failed to respond: ${errorMessage}`);
      setMessages(prev => [...prev, { role: 'model', parts: [{ text: `Error: ${errorMessage}` }] }]);
    } finally {
      setIsSending(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInputMessage('');
    setIsSending(false);
    setError('');
    addLog('INFO', 'Started new chatbot conversation.');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        ></div>
      )}

      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm transform transition-transform duration-300 ease-in-out bg-slate-900 border-l border-slate-800 z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="chatbot-panel-title"
      >
        <div className="flex justify-between items-center p-4 border-b border-slate-800 flex-shrink-0">
          <h2 id="chatbot-panel-title" className="text-lg font-bold text-white">Chat with Gemini</h2>
          <div className="flex items-center gap-2">
            <button
                onClick={handleNewChat}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Start new chat"
                title="New Chat"
            >
                <PlusIcon className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-1"
              aria-label="Close chatbot panel"
            >
              <XIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-slate-500 py-8">
              <p>Ask me anything!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] p-3 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-cyan-700/50 text-white rounded-br-md rounded-tr-xl rounded-tl-xl rounded-bl-xl'
                      : 'bg-slate-800 text-slate-200 rounded-bl-md rounded-tl-xl rounded-tr-xl rounded-br-xl'
                  }`}
                  aria-live="polite"
                >
                  {msg.parts[0].text}
                </div>
              </div>
            ))
          )}
          {isSending && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
            <div className="flex justify-start">
              <div className="max-w-[75%] p-3 rounded-lg bg-slate-800 text-slate-200 text-sm flex items-center gap-2 animate-pulse">
                <span className="typing-dots">
                    <span className="dot dot-1">.</span>
                    <span className="dot dot-2">.</span>
                    <span className="dot dot-3">.</span>
                </span>
              </div>
            </div>
          )}
          {error && (
            <div className="text-red-400 bg-red-900/50 p-3 rounded-lg text-sm text-center border border-red-800">
              {error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-800 flex-shrink-0 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            disabled={isSending}
            aria-label="Chat input"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isSending}
            className="p-2 rounded-md text-white bg-gradient-to-br from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cyan-500 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            {isSending ? (
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            ) : (
                <SendIcon className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
      {/* FIX: Removed 'jsx' property as it's not a standard HTML attribute for <style> tags in this setup. */}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          33% { opacity: 1; }
        }
        .typing-dots .dot-1 {
          animation: blink 1.2s infinite ease-in-out;
        }
        .typing-dots .dot-2 {
          animation: blink 1.2s infinite ease-in-out 0.4s;
        }
        .typing-dots .dot-3 {
          animation: blink 1.2s infinite ease-in-out 0.8s;
        }
      `}</style>
    </>
  );
};

export default ChatbotPanel;