# 🤖 CodeBuddy — AI Coding Assistant

A floating AI assistant that lives on your desktop. Press a hotkey → it captures your screen → tells you exactly what's wrong and how to fix it. **No coding knowledge needed to install!**

> Built by [Koyeliya Ghosh](https://github.com/koyeliya2004) 🚀

---

## 📥 How to Install (Step by Step)

### ✅ Step 1 — Download the App

1. Go to the [Releases](../../releases) page (click that link)
2. Under **Assets**, click **`CodeBuddy Setup 1.0.0.exe`**
3. It will download to your **Downloads** folder

---

### ✅ Step 2 — Open the Installer

1. Open your **Downloads** folder
2. Find the file **`CodeBuddy Setup 1.0.0.exe`**
3. **Double-click** it

---

### ✅ Step 3 — Handle Windows Warning

Windows will show a blue warning screen saying **"Windows protected your PC"**

Do this:
1. Click **"More info"** (small text below the warning)
2. A new button appears — click **"Run anyway"**

> ℹ️ This warning is normal for small apps without an expensive certificate. The app is completely safe!

---

### ✅ Step 4 — Install

1. A setup window opens
2. Click **Next**
3. Click **Install**
4. Click **Finish**
5. **CodeBuddy opens automatically!** 🎉

---

### ✅ Step 5 — Wait for Connection

When CodeBuddy opens you will see a small floating window on screen.

1. Look at the top — you will see a **yellow dot** and text saying **"Connecting..."**
2. Wait **5 to 20 seconds**
3. The dot turns **🟢 green** and says **"Ready ✓"**
4. You are ready to use it!

> ⚠️ If it stays yellow for more than 30 seconds — close and reopen the app. The free cloud server was sleeping!

---

### ✅ Step 6 — Capture Your Screen

1. Open your code / error / terminal (whatever you want AI to look at)
2. Press **`Ctrl + Shift + C`** on keyboard
3. CodeBuddy takes a screenshot automatically
4. A preview appears in the app — click **🧠 Analyze**
5. AI gives you the full fix in seconds!

---

### ✅ Step 7 — Read the Answer

CodeBuddy will reply with:

```
🔍 What I See     → what's on your screen
⚠️  The Problem   → what is wrong
🛠️  Fix Steps     → what to do (numbered steps)
📝  Code Fix      → exact code to copy-paste
▶️  Command       → command to run in terminal
```

---

### ✅ Step 8 — Ask Follow-Up Questions

You can also type in the chat box at the bottom:

1. Type your question (example: *"explain this error"* or *"give me the full fixed code"*)
2. Press **Enter**
3. AI replies!

> No need to capture screen again — it remembers the last screenshot!

---

## ⌨️ Keyboard Shortcuts

| Shortcut | What it does |
|---|---|
| `Ctrl + Shift + C` | Capture screen and analyze |
| `Ctrl + Shift + B` | Hide or show the overlay |
| `Enter` | Send your message |
| `Shift + Enter` | Add a new line in message box |

---

## ❓ Common Problems & Fixes

**Yellow dot / "Connecting..." for too long?**
> Close and reopen the app. Free server was sleeping, it wakes up in ~20 sec.

**Windows says "Windows protected your PC"?**
> Click **More info** → **Run anyway**. Totally safe!

**App not visible after install?**
> Look in the **system tray** (bottom right corner of taskbar, arrow icon). Right-click the 🤖 icon → Show.

**Capture button not working?**
> Make sure you opened the app as normal user (not administrator). Try pressing `Ctrl+Shift+C` directly.

---

## 🧠 How It Works (Simple Version)

```
You press Ctrl+Shift+C
        ↓
CodeBuddy takes a screenshot of your screen
        ↓
Sends it to AI server on the cloud
        ↓
Groq AI (Llama 4) reads your code and errors
        ↓
Sends back a full fix with steps and code
        ↓
You see the answer in the floating window!
```

**No Groq key needed. No Python needed. No CMD needed. Just install and use!**

---

## ✨ Features

- 🪟 Floating window — stays on top of VS Code, browser, terminal
- 📸 One-click screen capture
- 🧠 AI reads errors, stack traces, logs, code, terminal output
- 💬 Chat — ask follow-up questions
- 🛠️ Structured answers with copy-paste code
- 🌙 Dark premium design
- ☁️ Cloud backend — no local server needed

---

## 🔐 Privacy

- Screenshot captured **only** when you press the button
- Your Groq API key is **never** inside the app — safely on the server
- **No screenshots stored** — sent, analyzed, discarded instantly
- Session memory only — cleared when you close the app

---

## 🗂️ Tech Stack (For Developers)

| Layer | Tech |
|---|---|
| Desktop app | Electron + React + TypeScript |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| AI | Groq API — Llama 4 Scout + Llama 3.3 70B |
| Hosting | Render (free tier) |
| Screen capture | Electron desktopCapturer |

```
codebuddy-overlay/
├── apps/
│   └── desktop/          # Electron + React frontend
│       ├── electron/      # Main process
│       └── src/           # React UI
├── server/               # FastAPI backend (on Render)
└── README.md
```
