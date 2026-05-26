# 🤖 CodeBuddy — AI Coding Assistant

A floating AI assistant that lives on your desktop. Press a hotkey → it captures your screen → tells you exactly what's wrong and how to fix it. No setup needed.

> Built by [Koyeliya Ghosh](https://github.com/koyeliya2004) 🚀

---

## 📥 Install (For Friends — Super Easy!)

### Step 1 — Download
Download the latest installer:
👉 **`CodeBuddy Setup 1.0.0.exe`** from the [Releases](../../releases) page

### Step 2 — Install
1. Double-click the `.exe` file
2. Windows will show a warning — click **"More info"** → **"Run anyway"** (this is normal for unsigned apps)
3. Click **Next → Install → Finish**
4. CodeBuddy opens automatically! 🎉

### Step 3 — Use it
1. Wait **3-5 seconds** for the dot to turn 🟢 **green** (server connecting)
2. Press **`Ctrl+Shift+C`** OR click **📸 Capture**
3. AI analyzes your screen and gives you the fix!

> ⚠️ **First use of the day?** The server may take **~15-20 seconds** to wake up. Just wait and try again — it's free hosting!

---

## ⌨️ Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+C` | Capture screen + analyze |
| `Ctrl+Shift+B` | Hide / show the overlay |
| `Enter` | Send message |
| `Shift+Enter` | New line in message |

---

## 🧠 How It Works

```
You press Ctrl+Shift+C
        ↓
CodeBuddy captures your screen
        ↓
Screenshot sent to cloud server (Render)
        ↓
Groq AI (Llama 4) analyzes it
        ↓
Floating overlay shows:
  🔍 What I See
  ⚠️  The Problem
  🛠️  Fix Steps
  📝 Code Fix
  ▶️  Command to Run
```

**No Groq key needed. No Python needed. No CMD needed. Just install and use!**

---

## ✨ Features

- 🪟 Floating always-on-top overlay — works on top of VS Code, terminal, browser
- 📸 One-click full screen capture
- 🧠 AI reads your errors, stack traces, logs, terminal output
- 💬 Chat history — ask follow-up questions about the same screenshot
- 🛠️ Structured answers: What I See → Problem → Fix Steps → Code → Command
- 🌙 Dark premium design
- ☁️ Cloud backend — no local server needed

---

## 🤖 AI Models Used

| Task | Model |
|---|---|
| Screenshot analysis | `meta-llama/llama-4-scout-17b-16e-instruct` |
| Text chat | `llama-3.3-70b-versatile` |

---

## 🗂️ Project Structure (For Developers)

```
codebuddy-overlay/
├── apps/
│   └── desktop/          # Electron + React frontend
│       ├── electron/      # Main process (window, shortcuts)
│       └── src/           # React UI (App.tsx)
├── server/               # FastAPI backend (deployed on Render)
│   ├── main.py           # API routes + Groq integration
│   └── requirements.txt
└── README.md
```

---

## 🛠️ Tech Stack

| Layer | Tech |
|---|---|
| Desktop app | Electron + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| AI | Groq API — Llama 4 Scout + Llama 3.3 70B |
| Hosting | Render (free tier) |
| Screen capture | Electron desktopCapturer |

---

## 🔐 Privacy

- Screenshot is only captured when **you** press the button
- API key is **never** in the app — it's safely on the server
- No screenshots stored — sent, analyzed, discarded
- Session memory only — cleared when you close the app
