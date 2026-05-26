// Content script — injects CodeBuddy floating panel into GitHub and other coding sites

(function () {
  if (document.getElementById('codebuddy-overlay')) return;

  let panelVisible = false;
  let capturedScreenshot = null;
  const API_BASE = 'http://localhost:8000';
  let sessionHistory = [];

  // Create floating bubble
  const bubble = document.createElement('div');
  bubble.id = 'codebuddy-bubble';
  bubble.innerHTML = '🤖';
  Object.assign(bubble.style, {
    position: 'fixed', bottom: '24px', right: '24px',
    width: '52px', height: '52px',
    borderRadius: '50%', backgroundColor: '#1f1f1f',
    border: '2px solid #3a8591', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: '999999',
    fontSize: '22px', boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
    transition: 'transform 0.2s, border-color 0.2s'
  });

  // Create panel
  const panel = document.createElement('div');
  panel.id = 'codebuddy-overlay';
  Object.assign(panel.style, {
    position: 'fixed', bottom: '88px', right: '24px',
    width: '380px', height: '560px',
    backgroundColor: '#141414', border: '1px solid #2d2d2d',
    borderRadius: '16px', display: 'none',
    flexDirection: 'column', zIndex: '999998',
    boxShadow: '0 12px 48px rgba(0,0,0,0.7)',
    fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden'
  });

  panel.innerHTML = `
    <div style="padding:12px 16px;background:#0a0a0a;border-bottom:1px solid #2d2d2d;display:flex;align-items:center;justify-content:space-between;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:16px;">🤖</span>
        <span style="color:#fff;font-weight:600;font-size:13px;">CodeBuddy</span>
        <span id="cb-status-dot" style="width:8px;height:8px;border-radius:50%;background:#404040;display:inline-block;"></span>
        <span id="cb-status-text" style="color:#737373;font-size:11px;">Idle</span>
      </div>
      <button id="cb-close" style="background:none;border:none;color:#737373;cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;">✕</button>
    </div>
    <div style="display:flex;gap:6px;padding:8px 12px;background:#1f1f1f;border-bottom:1px solid #2d2d2d;flex-wrap:wrap;">
      <button id="cb-capture" style="background:#2d7480;color:#fff;border:none;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;font-weight:500;">📸 Capture Tab</button>
      <button id="cb-explain" style="background:#2d2d2d;color:#d1d1d1;border:none;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">⚠️ Error?</button>
      <button id="cb-next" style="background:#2d2d2d;color:#d1d1d1;border:none;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">➡️ Next</button>
      <button id="cb-fix" style="background:#2d2d2d;color:#d1d1d1;border:none;border-radius:8px;padding:5px 10px;font-size:11px;cursor:pointer;">🛠 Fix</button>
    </div>
    <div id="cb-preview" style="display:none;padding:8px 12px;background:#1f1f1f;border-bottom:1px solid #2d2d2d;">
      <p style="color:#a3a3a3;font-size:11px;margin-bottom:6px;">📸 Screenshot ready</p>
      <img id="cb-preview-img" style="width:100%;border-radius:8px;border:1px solid #2d2d2d;max-height:100px;object-fit:contain;" />
      <div style="display:flex;gap:6px;margin-top:6px;">
        <button id="cb-analyze" style="flex:1;background:#2d7480;color:#fff;border:none;border-radius:8px;padding:6px;font-size:11px;cursor:pointer;font-weight:500;">🧠 Analyze</button>
        <button id="cb-discard" style="background:#2d2d2d;color:#d1d1d1;border:none;border-radius:8px;padding:6px 10px;font-size:11px;cursor:pointer;">✕</button>
      </div>
    </div>
    <div id="cb-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px;">
      <div style="text-align:center;padding:32px 16px;color:#525252;font-size:12px;">
        <div style="font-size:32px;margin-bottom:8px;">🤖</div>
        <div style="font-weight:500;color:#737373;">CodeBuddy ready</div>
        <div style="margin-top:4px;">Capture your tab to analyze errors</div>
      </div>
    </div>
    <div style="padding:10px 12px;background:#0a0a0a;border-top:1px solid #2d2d2d;">
      <div style="display:flex;gap:6px;">
        <textarea id="cb-input" rows="2" placeholder="Ask about your code..." style="flex:1;background:#1f1f1f;border:1px solid #2d2d2d;color:#fff;font-size:12px;border-radius:8px;padding:8px;resize:none;outline:none;font-family:Inter,system-ui,sans-serif;"></textarea>
        <button id="cb-send" style="background:#2d7480;color:#fff;border:none;border-radius:8px;padding:8px 10px;cursor:pointer;font-size:16px;">➤</button>
      </div>
    </div>
  `;

  document.body.appendChild(bubble);
  document.body.appendChild(panel);

  const setStatus = (s, text) => {
    const dot = document.getElementById('cb-status-dot');
    const txt = document.getElementById('cb-status-text');
    const colors = { idle: '#404040', capturing: '#eab308', analyzing: '#3a8591', ready: '#22c55e', error: '#ef4444' };
    if (dot) dot.style.background = colors[s] || colors.idle;
    if (txt) txt.textContent = text;
  };

  const addMessage = (role, content, imgSrc = null) => {
    const msgs = document.getElementById('cb-messages');
    const isFirstEmpty = msgs.querySelector('[data-empty]');
    if (isFirstEmpty) isFirstEmpty.remove();

    const div = document.createElement('div');
    div.style.cssText = `display:flex;justify-content:${role === 'user' ? 'flex-end' : 'flex-start'};`;
    div.innerHTML = `
      <div style="max-width:90%;border-radius:12px;padding:8px 12px;font-size:11px;line-height:1.6;
        background:${role === 'user' ? '#2d7480' : '#1f1f1f'};
        color:${role === 'user' ? '#fff' : '#d1d1d1'};
        border:${role === 'assistant' ? '1px solid #2d2d2d' : 'none'};">
        ${imgSrc ? `<img src="${imgSrc}" style="width:100%;border-radius:6px;margin-bottom:6px;max-height:60px;object-fit:contain;" />` : ''}
        <div style="white-space:pre-wrap;word-break:break-word;">${content.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre style="background:#0a0a0a;padding:8px;border-radius:6px;overflow-x:auto;font-family:JetBrains Mono,monospace;font-size:10px;margin:4px 0;border:1px solid #2d2d2d;"><code>$2</code></pre>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</div>
      </div>
    `;
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
  };

  // Capture current tab
  document.getElementById('cb-capture').addEventListener('click', () => {
    setStatus('capturing', 'Capturing...');
    chrome.runtime.sendMessage({ action: 'capture-tab-screenshot' }, (response) => {
      if (response?.success) {
        capturedScreenshot = response.dataUrl;
        const preview = document.getElementById('cb-preview');
        const previewImg = document.getElementById('cb-preview-img');
        previewImg.src = capturedScreenshot;
        preview.style.display = 'block';
        setStatus('ready', 'Ready');
      } else {
        setStatus('error', 'Error');
      }
    });
  });

  document.getElementById('cb-analyze').addEventListener('click', async () => {
    if (!capturedScreenshot) return;
    const question = document.getElementById('cb-input').value.trim() || 'What is wrong? What should I do next?';
    addMessage('user', question, capturedScreenshot);
    document.getElementById('cb-preview').style.display = 'none';
    document.getElementById('cb-input').value = '';
    setStatus('analyzing', 'Analyzing...');

    try {
      const base64 = capturedScreenshot.replace('data:image/png;base64,', '').replace('data:image/jpeg;base64,', '');
      const res = await fetch(`${API_BASE}/analyze-screenshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshot_base64: base64, question, session_history: sessionHistory.slice(-6) })
      });
      const data = await res.json();
      sessionHistory.push({ role: 'user', content: question });
      sessionHistory.push({ role: 'assistant', content: data.answer });
      addMessage('assistant', data.answer);
      setStatus('idle', 'Idle');
      capturedScreenshot = null;
    } catch (err) {
      addMessage('assistant', `❌ Error: ${err.message}`);
      setStatus('error', 'Error');
    }
  });

  document.getElementById('cb-discard').addEventListener('click', () => {
    capturedScreenshot = null;
    document.getElementById('cb-preview').style.display = 'none';
    setStatus('idle', 'Idle');
  });

  document.getElementById('cb-send').addEventListener('click', async () => {
    const input = document.getElementById('cb-input');
    if (!input.value.trim()) return;
    const msg = input.value.trim();
    addMessage('user', msg);
    input.value = '';
    setStatus('analyzing', 'Thinking...');
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, session_history: sessionHistory.slice(-10) })
      });
      const data = await res.json();
      sessionHistory.push({ role: 'user', content: msg });
      sessionHistory.push({ role: 'assistant', content: data.answer });
      addMessage('assistant', data.answer);
      setStatus('idle', 'Idle');
    } catch (err) {
      addMessage('assistant', `❌ ${err.message}`);
      setStatus('error', 'Error');
    }
  });

  document.getElementById('cb-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      document.getElementById('cb-send').click();
    }
  });

  document.getElementById('cb-explain').addEventListener('click', () => {
    document.getElementById('cb-input').value = 'Why does this error occur?';
  });
  document.getElementById('cb-next').addEventListener('click', () => {
    document.getElementById('cb-input').value = 'What should I do next?';
  });
  document.getElementById('cb-fix').addEventListener('click', () => {
    document.getElementById('cb-input').value = 'Give me the exact code fix';
  });

  bubble.addEventListener('click', () => {
    panelVisible = !panelVisible;
    panel.style.display = panelVisible ? 'flex' : 'none';
    bubble.style.borderColor = panelVisible ? '#4f98a3' : '#3a8591';
    bubble.style.transform = panelVisible ? 'scale(1.1)' : 'scale(1)';
  });

  document.getElementById('cb-close').addEventListener('click', () => {
    panelVisible = false;
    panel.style.display = 'none';
    bubble.style.transform = 'scale(1)';
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'trigger-capture') document.getElementById('cb-capture').click();
    if (msg.action === 'toggle-panel') bubble.click();
  });
})();
