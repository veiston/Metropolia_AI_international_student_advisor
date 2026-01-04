'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import DocumentChip from './components/DocumentChip';
import MessageBubble from './components/MessageBubble';
import ToolsSidebar from './components/ToolsSidebar';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { ChecklistPayload, DocumentContext, Message } from './types';

function HomeContent() {
  const { darkMode, toggleDarkMode, theme } = useTheme();
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [checklist, setChecklist] = useState<ChecklistPayload | null>(null);
  const [documents, setDocuments] = useState<DocumentContext[]>([]);
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const [uploadProgress, setUploadProgress] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', content: query };
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setActiveTab('chat');
    setLoading(true);
    setQuery('');

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, history: history, documents }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const botMsg: Message = { role: 'assistant', content: '', citations: [] };

      setMessages(prev => [...prev, botMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                botMsg.content += data.text;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...botMsg };
                  return newMsgs;
                });
              }
              if (data.citations) {
                botMsg.citations = data.citations;
                setMessages(prev => {
                  const newMsgs = [...prev];
                  newMsgs[newMsgs.length - 1] = { ...botMsg };
                  return newMsgs;
                });
              }
            } catch (e) {
              console.error('Error parsing SSE data', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('API Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error connecting to server';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${errorMsg}. Please check that the API key is configured and try again.`
      }]);
    } finally {
      setLoading(false);
    }
  };

  const submitFile = async () => {
    if (!file) return;
    setLoading(true);
    setUploadProgress(10);
    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploadProgress(30);
      const res = await fetch('/api/upload-doc', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      setUploadProgress(70);
      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const { document: uploadedDocument, ...rest } = data as { document?: DocumentContext } & ChecklistPayload;
      if (uploadedDocument) {
        setDocuments(prev => {
          const filtered = prev.filter(doc => doc.name !== uploadedDocument.name);
          return [...filtered, uploadedDocument];
        });
      }
      setChecklist(rest);
      setActiveTab('chat');
      setUploadProgress(100);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Analyzed ${file.name}. See the generated checklist below.`
      }]);
    } catch (error) {
      console.error('Upload Error:', error);
      const errorMsg = error instanceof Error ? error.message : 'Error uploading file';
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `⚠️ ${errorMsg}`
      }]);
      setUploadProgress(100);
    } finally {
      setLoading(false);
      setFile(null);
      setTimeout(() => setUploadProgress(0), 900);
    }
  };

  return (
    <main className={`flex flex-col h-screen w-full ${theme.page}`}>
      <div className="flex-shrink-0 w-full">
        <div className="max-w-6xl mx-auto px-4 pb-3 sm:pb-4 pt-3 sm:pt-4">
          <header className={`rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 ${theme.header}`}>
            <div className="flex items-center gap-3 sm:gap-4">
              <div className={''}>
                <Image
                  src={'/Metropolia_logo.png'}
                  alt="Metropolia Logo"
                  width={180}
                  height={60}
                  className="object-contain h-10 sm:h-14 w-auto"
                  priority
                />
              </div>
              <div className="border-l-2 border-orange-500 pl-3 sm:pl-4">
                <h1 className="text-lg sm:text-2xl font-bold">Metropolia international student advisor 🌍🇫🇮</h1>
                <p className={`hidden sm:block text-sm ${theme.bodyText}`}>Your personalized assistant for student life in Finland and Metropolia</p>
              </div>
            </div>
            <button
              onClick={toggleDarkMode}
              className={`p-2 rounded-lg transition-colors ${darkMode
                ? 'bg-slate-800 text-yellow-300 hover:bg-slate-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              title={darkMode ? 'Switch to Light mode' : 'Switch to Dark mode'}
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.536l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.121-10.607a1 1 0 010 1.414l-.707.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zm5.657-9.193a1 1 0 00-1.414 0l-.707.707A1 1 0 005.05 6.464l.707-.707a1 1 0 001.414-1.414zM5 11a1 1 0 100-2H4a1 1 0 100 2h1z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </header>
        </div>
      </div>

      <div className="flex-1 w-full overflow-hidden">
        <div className="max-w-6xl h-full mx-auto px-4 pb-4 flex flex-col">
          <div className={`shadow-xl rounded-2xl overflow-hidden flex flex-col h-full ${theme.container}`}>
            <div className={`md:hidden flex border-b ${theme.divider}`}>
              {['chat', 'tools'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as 'chat' | 'tools')}
                  className={`flex-1 py-2.5 text-sm font-semibold transition ${activeTab === tab
                    ? 'bg-orange-500 text-white'
                    : darkMode
                      ? 'bg-transparent text-slate-200'
                      : 'bg-transparent text-gray-700'
                    }`}
                >
                  {tab === 'chat' ? 'Chat' : 'Tools'}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
              <div className={`flex-1 flex flex-col md:border-r ${theme.divider} ${activeTab === 'tools' ? 'hidden md:flex' : ''}`}>
                {documents.length > 0 && (
                  <div className={`flex-shrink-0 flex flex-wrap gap-2 p-4 border-b ${theme.divider} text-sm ${darkMode ? 'bg-gray-900/70' : 'bg-white/80'}`}>
                    {documents.map((doc, idx) => (
                      <DocumentChip key={idx} doc={doc} />
                    ))}
                    <button
                      onClick={() => setDocuments([])}
                      className="ml-auto text-xs text-gray-500 underline"
                    >
                      Clear documents
                    </button>
                  </div>
                )}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center mt-6 sm:mt-10 md:mt-16">
                      <h2 className={`text-xl sm:text-2xl font-bold ${theme.headingText} mb-2 sm:mb-3`}>Welcome to Metropolia!</h2>
                      <p className={`${theme.bodyText} mb-4 sm:mb-6`}>Ask me anything about student life in Finland</p>
                      <div className="space-y-2 max-w-md mx-auto">
                        <div className={`border rounded-lg p-4 text-sm text-left ${darkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                          <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Try: </span>
                          <span className={darkMode ? 'text-slate-200' : 'text-gray-700'}>&quot;How do I apply for a residence permit?&quot;</span>
                        </div>
                        <div className={`border rounded-lg p-4 text-sm text-left ${darkMode ? 'bg-slate-800/60 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                          <span className={`font-semibold ${darkMode ? 'text-slate-100' : 'text-gray-800'}`}>Try: </span>
                          <span className={darkMode ? 'text-slate-200' : 'text-gray-700'}>&quot;What is the YTHS healthcare fee?&quot;</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {messages.map((msg, idx) => (
                    <MessageBubble key={idx} msg={msg} showSources={showSources} />
                  ))}
                  {loading && (
                    <div className="flex items-center gap-2 text-gray-500 text-sm">
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                      <span>Thinking...</span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className={`flex-shrink-0 p-6 border-t ${theme.divider} ${darkMode ? 'bg-slate-900/60' : 'bg-white'}`}>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                      placeholder="Ask a question..."
                      className={`flex-1 p-3 sm:p-4 border-2 rounded-xl focus:outline-none focus:border-orange-500 transition-colors ${theme.input}`}
                    />
                    <button
                      onClick={handleAsk}
                      disabled={loading}
                      className="bg-orange-500 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-sm hover:shadow-md"
                    >
                      Send
                    </button>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <label className="flex items-center gap-2 cursor-pointer hover:text-orange-600 transition-colors">
                      <input
                        type="checkbox"
                        checked={showSources}
                        onChange={(e) => setShowSources(e.target.checked)}
                        className="rounded text-orange-500 focus:ring-orange-500"
                      />
                      Show Sources
                    </label>
                  </div>
                </div>
              </div>

              <ToolsSidebar
                file={file}
                onFileSelected={setFile}
                onSubmit={submitFile}
                loading={loading}
                checklist={checklist}
                uploadProgress={uploadProgress}
                hiddenOnMobile={activeTab === 'chat'}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <ThemeProvider>
      <HomeContent />
    </ThemeProvider>
  );
}
