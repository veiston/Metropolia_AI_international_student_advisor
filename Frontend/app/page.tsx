'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Citation {
  source: string;
  url: string;
  content: string;
}

interface Step {
  title: string;
  description: string;
  links: string;
  urgency: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  steps?: Step[];
}

export default function Home() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSources, setShowSources] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [checklist, setChecklist] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleAsk = async () => {
    if (!query.trim()) return;

    const userMsg: Message = { role: 'user', content: query };
    // Prepare history for backend (exclude current message, map to simple format)
    const history = messages.map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setQuery('');

    try {
      const res = await fetch('http://127.0.0.1:5000/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userMsg.content, history: history }),
      });

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let botMsg: Message = { role: 'assistant', content: '', citations: [] };

      // Add initial empty bot message
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
      setMessages(prev => [...prev, { role: 'assistant', content: 'Error connecting to server.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const submitFile = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('http://127.0.0.1:5000/api/upload-doc', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setChecklist(data);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Analyzed ${file.name}. See the generated checklist below.`
      }]);
    } catch (error) {
      alert('Error uploading file');
    } finally {
      setLoading(false);
      setFile(null);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <header className="bg-white shadow-md rounded-2xl mb-4 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Image
              src="/metropolia_cmyk_a_uusi-541377024.jpg"
              alt="Metropolia Logo"
              width={180}
              height={60}
              className="object-contain h-14 w-auto"
              priority
            />
            <div className="border-l-2 border-orange-500 pl-4">
              <h1 className="text-2xl font-bold text-gray-800">Metropolia international student advisor 🌍🇫🇮</h1>
              <p className="text-sm text-gray-600">Your personalized assistant for student life in Finland and Metropolia</p>
            </div>
          </div>
        </header>

        <div className="bg-white shadow-xl rounded-2xl overflow-hidden">

          <div className="flex flex-col md:flex-row h-[calc(100vh-12rem)]">
            {/* Chat Area */}
            <div className="flex-1 flex flex-col border-r border-gray-200">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center mt-20">
                    {/* #top bar for emoji */}
                    <h2 className="text-2xl font-bold text-gray-700 mb-3">Welcome to Metropolia!</h2>
                    <p className="text-gray-500 mb-6">Ask me anything about student life in Finland</p>
                    <div className="space-y-2 max-w-md mx-auto">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-left">
                        <span className="text-orange-600 font-semibold">Try: </span>
                        <span className="text-gray-700">"How do I apply for a residence permit?"</span>
                      </div>
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-left">
                        <span className="text-orange-600 font-semibold">Try: </span>
                        <span className="text-gray-700">"What is the YTHS healthcare fee?"</span>
                      </div>
                    </div>
                  </div>
                )}
                {messages.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
                      <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${isUser ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                        <div className="prose prose-sm max-w-none">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Steps Display */}
                        {msg.steps ? (
                          <div className="mt-3 space-y-2">
                            {msg.steps.map((step, sIdx) => (
                              <div key={sIdx} className="bg-white p-3 rounded-lg border-l-4 border-orange-500 shadow-sm text-sm">
                                <div className="font-bold text-orange-600">{step.title} {step.urgency ? <span className="text-red-500 text-xs">({step.urgency})</span> : null}</div>
                                <div>{step.description}</div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Citations */}
                        {msg.role === 'assistant' && msg.citations && msg.citations.length > 0 && showSources ? (
                          <div className="mt-3 pt-3 border-t border-gray-300 text-xs">
                            <p className="font-semibold text-gray-600 mb-2 flex items-center gap-1">
                              <span>📚</span> Sources:
                            </p>
                            <ul className="space-y-1">
                              {msg.citations.map((cit, cIdx) => (
                                <li key={cIdx}>
                                  <a href={cit.url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:text-orange-700 hover:underline">
                                    {cit.source}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
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

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    placeholder="Ask a question..."
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-orange-500 transition-colors text-gray-900"
                  />
                  <button
                    onClick={handleAsk}
                    disabled={loading}
                    className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold shadow-sm hover:shadow-md"
                  >
                    Send
                  </button>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
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

            {/* Sidebar / Tools */}
            <div className="w-full md:w-96 bg-gray-50 p-6 border-l border-gray-200 overflow-y-auto">
              <h2 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                <span>🛠️</span> Tools
              </h2>

              {/* Upload Section */}
              <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-4">
                <h3 className="font-semibold mb-2 text-sm text-orange-700 flex items-center gap-1">
                  <span>📄</span> Document Scanner
                </h3>
                <p className="text-xs text-gray-600 mb-3">Upload admission letter or rental contract for analysis.</p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="text-xs w-full"
                  />
                </div>
                {file && (
                  <button
                    onClick={submitFile}
                    disabled={loading}
                    className="mt-2 w-full bg-orange-500 text-white text-sm py-2 rounded-lg hover:bg-orange-600 font-semibold transition-colors"
                  >
                    Analyze {file.name}
                  </button>
                )}
              </div>

              {/* Checklist Section */}
              {checklist && (
                <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-200">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-sm text-orange-700 flex items-center gap-1">
                      <span>✅</span> Generated Checklist
                    </h3>
                  </div>

                  {checklist.summary && (
                    <p className="text-xs text-gray-600 mb-3 italic">{checklist.summary}</p>
                  )}

                  <div className="space-y-2">
                    {checklist.checklist && checklist.checklist.map((item: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <input type="checkbox" className="mt-1" />
                        <div>
                          <p className="font-medium">{item.title}</p>
                          <p className="text-xs text-gray-500">{item.description}</p>
                          {item.urgency && <span className="text-[10px] text-red-500 font-bold uppercase">{item.urgency}</span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {checklist.risks && (
                    <div className="mt-4 p-2 bg-red-50 rounded border border-red-100">
                      <h4 className="text-xs font-bold text-red-700 mb-1">Risks / Missing Info</h4>
                      <p className="text-xs text-red-600">{checklist.risks}</p>
                    </div>
                  )}
                </div>
              )}

              {!checklist && (
                <div className="text-center text-gray-400 text-sm mt-10">
                  Upload a document to see a checklist here.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
