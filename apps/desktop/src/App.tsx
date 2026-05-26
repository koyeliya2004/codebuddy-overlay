import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axios from 'axios';

const API_BASE = 'http://localhost:8000';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  screenshot?: string;
  timestamp: number;
};

type Status = 'idle' | 'capturing' | 'analyzing' | 'ready' | 'error';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if ((window as any).electronAPI?.onTriggerCapture) {
      (window as any).electronAPI.onTriggerCapture(() => {
        handleCapture();
      });
    }
    return () => {
      (window as any).electronAPI?.removeTriggerCapture?.();
    };
  }, []);

  const handleCapture = async () => {
    setStatus('capturing');
    try {
      const result = await (window as any).electronAPI?.captureScreen();
      if (result?.success) {
        setScreenshot(result.preview);
        setPreviewVisible(true);
        setStatus('ready');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const sendAnalysis = async () => {
    if (!screenshot) return;
    const question = input.trim() || 'What is wrong? What should I do next?';
    setStatus('analyzing');
    setPreviewVisible(false);

    const userMsg: Message = {
      role: 'user',
      content: question,
      screenshot: screenshot,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const historyPayload = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const base64 = screenshot.replace('data:image/png;base64,', '');

      const res = await axios.post(`${API_BASE}/analyze-screenshot`, {
        screenshot_base64: base64,
        question,
        session_history: historyPayload,
      });

      const botMsg: Message = {
        role: 'assistant',
        content: res.data.answer,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      setStatus('idle');
      setScreenshot(null);
    } catch (err: any) {
      const errMsg: Message = {
        role: 'assistant',
        content: `❌ Error: ${err?.response?.data?.detail || err.message}`,
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errMsg]);
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
        message: currentInput,
        session_history: historyPayload,
      });
      const botMsg: Message = { role: 'assistant', content: res.data.answer, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      setStatus('idle');
    } catch (err: any) {
      const errMsg: Message = { role: 'assistant', content: `❌ ${err?.response?.data?.detail || err.message}`, timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
      setStatus('error');
    }
  };

  const statusColor = {
    idle: 'bg-dark-500',
    capturing: 'bg-yellow-500',
    analyzing: 'bg-teal-500 animate-pulse',
    ready: 'bg-green-500',
    error: 'bg-red-500',
  }[status];

  const statusText = {
    idle: 'Idle',
    capturing: 'Capturing...',
    analyzing: 'Analyzing...',
    ready: 'Ready',
    error: 'Error',
  }[status];

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <button
          onClick={() => setIsMinimized(false)}
          className="w-14 h-14 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center shadow-2xl hover:border-teal-500 transition-all no-drag"
          title="Open CodeBuddy"
        >
          <span className="text-2xl">🤖</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-dark-800 border border-dark-600 rounded-2xl shadow-2xl overflow-hidden" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div className="drag-region flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-700">
        <div className="flex items-center gap-2 no-drag">
          <span className="text-lg">🤖</span>
          <span className="text-white font-semibold text-sm tracking-tight">CodeBuddy</span>
          <div className={`w-2 h-2 rounded-full ${statusColor}`} title={statusText}></div>
          <span className="text-dark-300 text-xs">{statusText}</span>
        </div>
        <div className="flex gap-2 no-drag">
          <button
            onClick={() => setMessages([])}
            className="text-dark-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-dark-700 transition-colors"
            title="Clear chat"
          >🗑</button>
          <button
            onClick={() => setIsMinimized(true)}
            className="text-dark-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-dark-700 transition-colors"
          >—</button>
          <button
            onClick={() => (window as any).electronAPI?.closeApp?.()}
            className="text-dark-300 hover:text-red-400 text-xs px-2 py-1 rounded hover:bg-dark-700 transition-colors"
          >✕</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 px-3 py-2 bg-dark-800 border-b border-dark-700 flex-wrap">
        <button
          onClick={handleCapture}
          disabled={status === 'analyzing' || status === 'capturing'}
          className="flex items-center gap-1 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📸 Capture
        </button>
        <button
          onClick={() => { setInput('Why does this error occur?'); }}
          className="flex items-center gap-1 px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg transition-colors"
        >
          ⚠️ Explain Error
        </button>
        <button
          onClick={() => { setInput('What should I do next?'); }}
          className="flex items-center gap-1 px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg transition-colors"
        >
          ➡️ Next Step
        </button>
        <button
          onClick={() => { setInput('Give me the fix code'); }}
          className="flex items-center gap-1 px-2 py-1.5 bg-dark-700 hover:bg-dark-600 text-dark-200 text-xs rounded-lg transition-colors"
        >
          🛠 Fix Code
        </button>
      </div>

      {/* Screenshot preview */}
      {previewVisible && screenshot && (
        <div className="px-3 py-2 bg-dark-700 border-b border-dark-600">
          <p className="text-xs text-dark-300 mb-2">📸 Screenshot captured — ready to analyze</p>
          <img src={screenshot} alt="Screenshot preview" className="w-full rounded-lg border border-dark-600 max-h-32 object-contain" />
          <div className="flex gap-2 mt-2">
            <button
              onClick={sendAnalysis}
              className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs rounded-lg font-medium transition-colors"
            >
              🧠 Analyze this
            </button>
            <button
              onClick={() => { setScreenshot(null); setPreviewVisible(false); setStatus('idle'); }}
              className="px-3 py-1.5 bg-dark-600 hover:bg-dark-500 text-dark-200 text-xs rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <span className="text-4xl mb-3">🤖</span>
            <p className="text-dark-300 text-sm font-medium">CodeBuddy is ready</p>
            <p className="text-dark-400 text-xs mt-1">Press 📸 Capture or<br /><kbd className="bg-dark-700 px-1 rounded text-xs">Ctrl+Shift+C</kbd> to analyze your screen</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-xl px-3 py-2.5 text-xs ${
              msg.role === 'user'
                ? 'bg-teal-700 text-white'
                : 'bg-dark-700 text-dark-100 border border-dark-600'
            }`}>
              {msg.screenshot && (
                <img src={msg.screenshot} alt="screenshot" className="w-full rounded-lg mb-2 max-h-20 object-contain border border-dark-600" />
              )}
              <div className="code-block prose prose-invert prose-xs max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {status === 'analyzing' && (
          <div className="flex justify-start">
            <div className="bg-dark-700 border border-dark-600 rounded-xl px-3 py-2.5 text-xs text-dark-300">
              <span className="animate-pulse">🧠 Analyzing...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input area */}
      <div className="px-3 py-3 bg-dark-900 border-t border-dark-700">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                screenshot && previewVisible ? sendAnalysis() : sendChat();
              }
            }}
            placeholder={screenshot ? 'Add a question about the screenshot...' : 'Ask anything... (Enter to send)'}
            rows={2}
            disabled={status === 'analyzing'}
            className="flex-1 bg-dark-700 border border-dark-600 text-white text-xs rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-teal-500 transition-colors placeholder-dark-400 disabled:opacity-50"
          />
          <button
            onClick={() => screenshot && previewVisible ? sendAnalysis() : sendChat()}
            disabled={status === 'analyzing' || (!input.trim() && !screenshot)}
            className="p-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="text-dark-500 text-xs mt-1.5 text-center">
          <kbd className="bg-dark-700 px-1 rounded">Ctrl+Shift+C</kbd> capture &nbsp;·&nbsp;
          <kbd className="bg-dark-700 px-1 rounded">Ctrl+Shift+B</kbd> hide/show &nbsp;·&nbsp;
          <kbd className="bg-dark-700 px-1 rounded">Enter</kbd> send
        </p>
      </div>
    </div>
  );
}
