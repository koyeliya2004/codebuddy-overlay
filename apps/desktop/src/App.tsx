import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const API_BASE = 'https://codebuddy-overlay-1.onrender.com';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  screenshot?: string;
  timestamp: number;
};

type Status = 'idle' | 'capturing' | 'analyzing' | 'ready' | 'error' | 'waking';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('waking');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ping server on startup to wake it up
  useEffect(() => {
    axios.get(`${API_BASE}/health`, { timeout: 30000 })
      .then(() => setStatus('idle'))
      .catch(() => setStatus('idle'));
  }, []);

  useEffect(() => {
    if ((window as any).electronAPI?.onTriggerCapture) {
      (window as any).electronAPI.onTriggerCapture(() => handleCapture());
    }
    return () => { (window as any).electronAPI?.removeTriggerCapture?.(); };
  }, []);

  const handleCapture = async () => {
    setStatus('capturing');
    try {
      const result = await (window as any).electronAPI?.captureScreen();
      if (result?.success) {
        setScreenshot(result.preview);
        setPreviewVisible(true);
        setStatus('ready');
      } else { setStatus('error'); }
    } catch { setStatus('error'); }
  };

  const sendAnalysis = async () => {
    if (!screenshot) return;
    const question = input.trim() || 'What is wrong? What should I do next?';
    setStatus('analyzing');
    setPreviewVisible(false);
    const userMsg: Message = { role: 'user', content: question, screenshot, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    try {
      const historyPayload = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const base64 = screenshot.replace('data:image/png;base64,', '');
      const res = await axios.post(`${API_BASE}/analyze-screenshot`, {
        screenshot_base64: base64, question, session_history: historyPayload,
      }, { timeout: 60000 });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer, timestamp: Date.now() }]);
      setStatus('idle');
      setScreenshot(null);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err?.response?.data?.detail || err.message}\n\n💡 Server may be waking up — wait 20 sec and try again!`, timestamp: Date.now() }]);
      setStatus('error');
    }
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    setStatus('analyzing');
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    try {
      const historyPayload = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${API_BASE}/chat`, {
        message: currentInput, session_history: historyPayload,
      }, { timeout: 60000 });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer, timestamp: Date.now() }]);
      setStatus('idle');
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `❌ ${err?.response?.data?.detail || err.message}\n\n💡 Server may be waking up — wait 20 sec and try again!`, timestamp: Date.now() }]);
      setStatus('error');
    }
  };

  const statusColor = {
    idle: 'bg-green-500', capturing: 'bg-yellow-500',
    analyzing: 'bg-teal-500 animate-pulse', ready: 'bg-green-500',
    error: 'bg-red-500', waking: 'bg-yellow-400 animate-pulse'
  }[status];

  const statusText = {
    idle: 'Ready ✓', capturing: 'Capturing...', analyzing: 'Analyzing...',
    ready: 'Captured!', error: 'Retry', waking: 'Connecting...'
  }[status];

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <button onClick={() => setIsMinimized(false)} className="w-14 h-14 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center shadow-2xl hover:border-teal-500 transition-all no-drag">
          <span className="text-2xl">🤖</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="drag-region flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-700">
        <div className="flex items-center gap-2 no-drag">
          <span className="text-lg">🤖</span>
          <span className="text-white font-semibold text-sm tracking-tight">CodeBuddy</span>
          <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
          <span className="text-dark-300 text-xs">{statusText}</span>
        </div>
        <div className="flex gap-2 no-drag">
          <button onClick={() => setMessages([])} className="text-dark-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-dark-700">🗑</button>
          <button onClick={() => setIsMinimized(true)} className="text-dark-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-dark-700">—</button>
          <button onClick={() => (window as any).electronAPI?.closeApp?.()} className="text-dark-300 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-dark-700">✕</button>
        </div>
      </div>

      <div className="flex gap-2 px-3 py-2 bg-dark-800 border-b border-dark-700 flex-wrap">
        <button onClick={handleCapture} disabled={status === 'analyzing' || status === 'capturing' || status === 'waking'}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-lg font-medium disabled:opacity-50">📸 Capture</button>
        <button onClick={() => setInput('Why does this error occur?')} className="px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg">⚠️ Explain</button>
        <button onClick={() => setInput('What should I do next?')} className="px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg">➡️ Next</button>
        <button onClick={() => setInput('Give me the fix code')} className="px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg">🛠 Fix</button>
      </div>

      {previewVisible && screenshot && (
        <div className="px-3 py-2 bg-dark-700 border-b border-dark-600">
          <p className="text-xs text-dark-300 mb-2">📸 Ready to analyze</p>
          <img src={screenshot} alt="preview" className="w-full rounded-lg border border-dark-600 max-h-32 object-contain" />
          <div className="flex gap-2 mt-2">
            <button onClick={sendAnalysis} className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-lg">🧠 Analyze</button>
            <button onClick={() => { setScreenshot(null); setPreviewVisible(false); setStatus('idle'); }} className="px-3 py-1.5 bg-dark-600 text-dark-200 text-xs rounded-lg">✕</button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <span className="text-4xl mb-3">🤖</span>
            <p className="text-dark-300 text-sm font-medium">
              {status === 'waking' ? 'Connecting to server...' : 'CodeBuddy is ready!'}
            </p>
            <p className="text-dark-400 text-xs mt-1">Press 📸 or <kbd className="bg-dark-700 px-1 rounded">Ctrl+Shift+C</kbd></p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-3 py-2.5 text-xs ${
              msg.role === 'user' ? 'bg-teal-700 text-white' : 'bg-dark-700 text-dark-100 border border-dark-600'
            }`}>
              {msg.screenshot && <img src={msg.screenshot} alt="ss" className="w-full rounded mb-2 max-h-20 object-contain" />}
              <div className="prose prose-invert prose-xs max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {status === 'analyzing' && (
          <div className="flex justify-start">
            <div className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-xs text-dark-300 animate-pulse">🧠 Analyzing...</div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="px-3 py-3 bg-dark-900 border-t border-dark-700">
        <div className="flex gap-2 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); screenshot && previewVisible ? sendAnalysis() : sendChat(); } }}
            placeholder={screenshot ? 'Question about screenshot...' : 'Ask anything... (Enter to send)'}
            rows={2} disabled={status === 'analyzing' || status === 'waking'}
            className="flex-1 bg-dark-700 border border-dark-600 text-white text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-teal-500 placeholder-dark-400 disabled:opacity-50"
          />
          <button onClick={() => screenshot && previewVisible ? sendAnalysis() : sendChat()}
            disabled={status === 'analyzing' || status === 'waking' || (!input.trim() && !screenshot)}
            className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <p className="text-dark-500 text-xs mt-1.5 text-center">
          <kbd className="bg-dark-700 px-1 rounded">Ctrl+Shift+C</kbd> capture · <kbd className="bg-dark-700 px-1 rounded">Enter</kbd> send
        </p>
      </div>
    </div>
  );
}
