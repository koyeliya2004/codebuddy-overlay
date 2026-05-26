import React, { useState, useEffect, useRef, useCallback } from 'react';
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
type Tab = 'chat' | 'history' | 'crop';

const QUICK_PROMPTS = [
  { icon: '🐛', label: 'Fix Bug', text: 'What is the bug and how do I fix it?' },
  { icon: '📖', label: 'Explain', text: 'Explain this code step by step' },
  { icon: '✨', label: 'Improve', text: 'How can I improve this code?' },
  { icon: '🧪', label: 'Test', text: 'Write unit tests for this code' },
  { icon: '📝', label: 'Document', text: 'Write documentation for this' },
  { icon: '⚡', label: 'Optimize', text: 'Optimize this for performance' },
  { icon: '🔒', label: 'Security', text: 'Find security issues in this code' },
  { icon: '🎨', label: 'Refactor', text: 'Refactor this code to be cleaner' },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [allHistory, setAllHistory] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<Status>('waking');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [croppedShot, setCroppedShot] = useState<string | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const [cropMode, setCropMode] = useState(false);
  const [cropStart, setCropStart] = useState<{x:number,y:number}|null>(null);
  const [cropRect, setCropRect] = useState<{x:number,y:number,w:number,h:number}|null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Wake up server
  useEffect(() => {
    axios.get(`${API_BASE}/health`, { timeout: 30000 })
      .then(() => setStatus('idle'))
      .catch(() => setStatus('idle'));
  }, []);

  // Load history from memory
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('buddy_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        setAllHistory(parsed);
      }
    } catch {}
  }, []);

  // Save history
  useEffect(() => {
    if (allHistory.length > 0) {
      try { sessionStorage.setItem('buddy_history', JSON.stringify(allHistory.slice(-200))); } catch {}
    }
  }, [allHistory]);

  useEffect(() => {
    if ((window as any).electronAPI?.onTriggerCapture) {
      (window as any).electronAPI.onTriggerCapture(() => handleCapture());
    }
    return () => { (window as any).electronAPI?.removeTriggerCapture?.(); };
  }, []);

  const handleCapture = async () => {
    setStatus('capturing');
    setCropMode(false);
    setCropRect(null);
    setCroppedShot(null);
    try {
      const result = await (window as any).electronAPI?.captureScreen();
      if (result?.success) {
        setScreenshot(result.preview);
        setPreviewVisible(true);
        setStatus('ready');
      } else setStatus('error');
    } catch { setStatus('error'); }
  };

  // Crop logic
  const handleCropMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cropMode) return;
    const rect = imgRef.current!.getBoundingClientRect();
    setCropStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setCropRect(null);
  };

  const handleCropMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!cropMode || !cropStart) return;
    const rect = imgRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setCropRect({
      x: Math.min(cropStart.x, x), y: Math.min(cropStart.y, y),
      w: Math.abs(x - cropStart.x), h: Math.abs(y - cropStart.y)
    });
  };

  const handleCropMouseUp = () => {
    if (!cropMode || !cropRect || !imgRef.current || !screenshot) return;
    const img = imgRef.current;
    const scaleX = 1920 / img.clientWidth;
    const scaleY = 1080 / img.clientHeight;
    const canvas = document.createElement('canvas');
    canvas.width = cropRect.w * scaleX;
    canvas.height = cropRect.h * scaleY;
    const ctx = canvas.getContext('2d')!;
    const image = new Image();
    image.onload = () => {
      ctx.drawImage(image, cropRect.x * scaleX, cropRect.y * scaleY, cropRect.w * scaleX, cropRect.h * scaleY, 0, 0, canvas.width, canvas.height);
      setCroppedShot(canvas.toDataURL('image/png'));
      setCropMode(false);
      setCropStart(null);
    };
    image.src = screenshot;
  };

  const getActiveShot = () => croppedShot || screenshot;

  const sendAnalysis = async () => {
    const activeShot = getActiveShot();
    if (!activeShot) return;
    const question = input.trim() || 'What do you see? Analyze and help me.';
    setStatus('analyzing');
    setPreviewVisible(false);
    const userMsg: Message = { role: 'user', content: question, screenshot: activeShot, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setAllHistory(prev => [...prev, userMsg]);
    setInput('');
    try {
      const historyPayload = allHistory.slice(-10).map(m => ({ role: m.role, content: m.content }));
      const base64 = activeShot.replace('data:image/png;base64,', '');
      const res = await axios.post(`${API_BASE}/analyze-screenshot`, {
        screenshot_base64: base64, question, session_history: historyPayload,
      }, { timeout: 60000 });
      const botMsg: Message = { role: 'assistant', content: res.data.answer, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      setAllHistory(prev => [...prev, botMsg]);
      setStatus('idle');
      setScreenshot(null);
      setCroppedShot(null);
    } catch (err: any) {
      const errMsg: Message = { role: 'assistant', content: `❌ ${err?.response?.data?.detail || err.message}\n\n💡 Server may be waking up — wait 20 sec and try again!`, timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
      setAllHistory(prev => [...prev, errMsg]);
      setStatus('error');
    }
  };

  const sendChat = async () => {
    if (!input.trim()) return;
    setStatus('analyzing');
    const userMsg: Message = { role: 'user', content: input.trim(), timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setAllHistory(prev => [...prev, userMsg]);
    const currentInput = input.trim();
    setInput('');
    try {
      const historyPayload = allHistory.slice(-20).map(m => ({ role: m.role, content: m.content }));
      const res = await axios.post(`${API_BASE}/chat`, {
        message: currentInput, session_history: historyPayload,
      }, { timeout: 60000 });
      const botMsg: Message = { role: 'assistant', content: res.data.answer, timestamp: Date.now() };
      setMessages(prev => [...prev, botMsg]);
      setAllHistory(prev => [...prev, botMsg]);
      setStatus('idle');
    } catch (err: any) {
      const errMsg: Message = { role: 'assistant', content: `❌ ${err?.response?.data?.detail || err.message}\n\n💡 Server may be waking up — wait 20 sec and try again!`, timestamp: Date.now() };
      setMessages(prev => [...prev, errMsg]);
      setAllHistory(prev => [...prev, errMsg]);
      setStatus('error');
    }
  };

  const statusDot = { idle: 'bg-emerald-400', capturing: 'bg-amber-400 animate-pulse', analyzing: 'bg-violet-400 animate-pulse', ready: 'bg-emerald-400', error: 'bg-rose-400', waking: 'bg-amber-300 animate-pulse' }[status];
  const statusLabel = { idle: 'Ready', capturing: 'Capturing…', analyzing: 'Thinking…', ready: 'Captured!', error: 'Retry', waking: 'Connecting…' }[status];

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: number) => new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });

  if (isMinimized) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <button onClick={() => setIsMinimized(false)}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-2xl no-drag transition-transform hover:scale-110 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: '2px solid rgba(255,255,255,0.2)' }}
          title="Open Buddy">
          <span className="text-3xl">🤖</span>
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif", background: 'linear-gradient(160deg, #0f0c1a 0%, #130f23 50%, #0d1117 100%)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '16px', boxShadow: '0 25px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)' }}>

      {/* Header */}
      <div className="drag-region flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.15), rgba(79,70,229,0.1))', borderBottom: '1px solid rgba(139,92,246,0.2)' }}>
        <div className="flex items-center gap-2.5 no-drag">
          <div className="relative">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 0 12px rgba(124,58,237,0.5)' }}>🤖</div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-900 ${statusDot}`}></div>
          </div>
          <div>
            <div className="text-white font-bold text-sm tracking-tight">Buddy</div>
            <div className="text-purple-300 text-xs">{statusLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 no-drag">
          <button onClick={() => { setMessages([]); }} title="Clear chat"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-xs">🗑</button>
          <button onClick={() => setIsMinimized(true)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm">—</button>
          <button onClick={() => (window as any).electronAPI?.closeApp?.()}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all text-sm">✕</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 pt-2 pb-1 flex-shrink-0">
        {(['chat', 'history'] as Tab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className="px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize"
            style={activeTab === t
              ? { background: 'rgba(124,58,237,0.3)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
              : { color: '#6b7280', border: '1px solid transparent' }}>
            {t === 'chat' ? '💬 Chat' : '📚 History'}
          </button>
        ))}
        <div className="ml-auto flex gap-1">
          <button onClick={handleCapture} disabled={status === 'analyzing' || status === 'capturing' || status === 'waking'}
            className="px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
            📸 Capture
          </button>
        </div>
      </div>

      {/* Quick prompts */}
      {activeTab === 'chat' && !previewVisible && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {QUICK_PROMPTS.map(p => (
              <button key={p.label} onClick={() => setInput(p.text)}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs transition-all whitespace-nowrap"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.2)'; (e.currentTarget as HTMLElement).style.color = '#c4b5fd'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = '#9ca3af'; }}>
                {p.icon} {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Screenshot preview + crop */}
      {previewVisible && screenshot && activeTab === 'chat' && (
        <div className="px-3 pb-2 flex-shrink-0">
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(0,0,0,0.4)' }}>
            <div className="px-3 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span className="text-xs text-purple-300">📸 {croppedShot ? 'Cropped ✂️' : 'Screenshot'}</span>
              <div className="flex gap-1.5">
                <button onClick={() => setCropMode(!cropMode)}
                  className="px-2 py-0.5 rounded text-xs transition-all"
                  style={cropMode ? { background: 'rgba(245,158,11,0.3)', color: '#fbbf24' } : { background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>
                  ✂️ {cropMode ? 'Cropping…' : 'Crop'}
                </button>
                {croppedShot && (
                  <button onClick={() => setCroppedShot(null)}
                    className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}>Reset</button>
                )}
                <button onClick={() => { setScreenshot(null); setCroppedShot(null); setPreviewVisible(false); setStatus('idle'); setCropMode(false); }}
                  className="w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-rose-400 transition-all text-xs">✕</button>
              </div>
            </div>
            <div className="relative" style={{ cursor: cropMode ? 'crosshair' : 'default' }}>
              <img ref={imgRef} src={croppedShot || screenshot} alt="preview"
                className="w-full max-h-28 object-contain"
                style={{ display: 'block' }}
                onMouseDown={handleCropMouseDown}
                onMouseMove={handleCropMouseMove}
                onMouseUp={handleCropMouseUp}
              />
              {cropMode && cropRect && (
                <div className="absolute pointer-events-none" style={{
                  left: cropRect.x, top: cropRect.y, width: cropRect.w, height: cropRect.h,
                  border: '2px dashed #a78bfa', background: 'rgba(139,92,246,0.15)'
                }} />
              )}
            </div>
            <div className="px-3 py-2">
              <button onClick={sendAnalysis} disabled={status === 'analyzing'}
                className="w-full py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }}>
                🧠 Analyze this screenshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat / History content */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0">
        {activeTab === 'chat' && (
          <>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))', border: '1px solid rgba(139,92,246,0.3)' }}>🤖</div>
                <p className="text-white font-semibold text-sm mb-1">
                  {status === 'waking' ? 'Connecting to Buddy…' : 'Hey! I\'m Buddy ✨'}
                </p>
                <p className="text-gray-500 text-xs max-w-[200px]">
                  {status === 'waking' ? 'Please wait a moment…' : 'Capture your screen or ask me anything!'}
                </p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-sm"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>🤖</div>
                )}
                <div className="max-w-[85%]">
                  <div className={`rounded-2xl px-3 py-2.5 text-xs ${
                    msg.role === 'user'
                      ? 'rounded-tr-sm'
                      : 'rounded-tl-sm'
                  }`} style={msg.role === 'user'
                    ? { background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: 'white' }
                    : { background: 'rgba(255,255,255,0.06)', color: '#e5e7eb', border: '1px solid rgba(255,255,255,0.08)' }}>
                    {msg.screenshot && (
                      <img src={msg.screenshot} alt="ss" className="w-full rounded-lg mb-2 max-h-16 object-contain" />
                    )}
                    <div className="prose prose-invert prose-xs max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  </div>
                  <div className={`text-xs mt-0.5 text-gray-600 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}
            {status === 'analyzing' && (
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>🤖</div>
                <div className="rounded-2xl rounded-tl-sm px-3 py-2.5"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </>
        )}

        {activeTab === 'history' && (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">All conversations ({allHistory.length} messages)</span>
              <button onClick={() => { setAllHistory([]); try { sessionStorage.removeItem('buddy_history'); } catch {} }}
                className="text-xs text-rose-400 hover:text-rose-300 transition-colors">Clear all</button>
            </div>
            {allHistory.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-600 text-xs">No history yet</p>
              </div>
            )}
            {allHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[90%] rounded-xl px-3 py-2 text-xs"
                  style={msg.role === 'user'
                    ? { background: 'rgba(124,58,237,0.25)', color: '#c4b5fd', border: '1px solid rgba(124,58,237,0.3)' }
                    : { background: 'rgba(255,255,255,0.04)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-gray-600 text-xs mb-1">{formatDate(msg.timestamp)} {formatTime(msg.timestamp)}</div>
                  <div className="line-clamp-3">{msg.content}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Input area */}
      {activeTab === 'chat' && (
        <div className="px-3 py-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="flex gap-2 items-end">
            <div className="flex-1 relative">
              <textarea value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    screenshot && previewVisible ? sendAnalysis() : sendChat();
                  }
                }}
                placeholder={screenshot ? 'Ask about the screenshot…' : 'Ask me anything…'}
                rows={2} disabled={status === 'analyzing' || status === 'waking'}
                className="w-full text-white text-xs rounded-xl px-3 py-2.5 resize-none focus:outline-none placeholder-gray-600 disabled:opacity-40"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', transition: 'border-color 0.2s' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.5)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; }}
              />
            </div>
            <button onClick={() => screenshot && previewVisible ? sendAnalysis() : sendChat()}
              disabled={status === 'analyzing' || status === 'waking' || (!input.trim() && !screenshot)}
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all disabled:opacity-40"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 2px 8px rgba(124,58,237,0.4)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-gray-700 text-xs mt-2 text-center">
            <kbd className="px-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.07)' }}>Ctrl+Shift+C</kbd> capture &nbsp;·&nbsp;
            <kbd className="px-1 rounded text-xs" style={{ background: 'rgba(255,255,255,0.07)' }}>Enter</kbd> send
          </p>
        </div>
      )}
    </div>
  );
}
