# 🤖 CodeBuddy Overlay

An AI-powered floating coding assistant that captures your screen and uses **Groq API** to give you debugging help, code fixes, and next-step guidance — right on your laptop.

## ✨ Features

- 🪟 Floating always-on-top overlay on your desktop
- 📸 Capture full screen, current window, or selected region
- 🧠 Groq-powered screenshot analysis (multimodal)
- 💬 Chat memory — remembers recent context
- 🛠️ Structured debugging answers: Issue → Cause → Fix → Command
- 📋 Copyable code blocks & terminal commands
- 🔒 Privacy-first: asks permission before every capture
- 🌙 Dark premium devtool design

## 🗂️ Project Structure

```
codebuddy-overlay/
├── apps/
│   ├── desktop/          # Electron overlay app
│   └── extension/        # Chrome extension (V2)
├── server/               # FastAPI backend → Groq proxy
├── shared/               # Shared types & prompt builders
└── README.md
```

## 🚀 Quick Start

### 1. Clone the repo
```bash
git clone https://github.com/koyeliya2004/codebuddy-overlay
cd codebuddy-overlay
```

### 2. Set up backend
```bash
cd server
pip install -r requirements.txt
cp .env.example .env
# Add your GROQ_API_KEY in .env
uvicorn main:app --reload --port 8000
```

### 3. Start desktop app
```bash
cd apps/desktop
npm install
npm run dev
```

## 🔑 Get Free Groq API Key

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up free
3. Create API key
4. Paste into `server/.env`

## 🧠 Models Used

| Task | Model |
|------|-------|
| Screenshot analysis | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Text chat | `llama-3.3-70b-versatile` |

## 📸 How it works

```
User presses hotkey
    ↓
Electron captures screenshot
    ↓
Screenshot + question sent to FastAPI
    ↓
FastAPI sends to Groq (multimodal)
    ↓
Groq returns structured debugging answer
    ↓
Floating overlay shows: Issue → Cause → Fix → Command
```

## 📦 Tech Stack

- **Desktop:** Electron + React + TypeScript
- **Backend:** FastAPI (Python)
- **AI:** Groq API (free tier)
- **Styling:** Tailwind CSS dark theme
- **Screen capture:** Electron desktopCapturer

## 🔐 Privacy

- Screenshot is only sent after user confirmation
- API key never exposed to frontend
- No data stored permanently — session memory only
- User can crop/blur screenshot before sending

---

Built by [Koyeliya Ghosh](https://github.com/koyeliya2004) 🚀
