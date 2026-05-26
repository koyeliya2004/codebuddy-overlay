# CodeBuddy - Quick Start Guide

## First Time Setup

1. Add your Groq API key to `server/.env`
2. Install Python dependencies:
   ```
   cd server
   pip install -r requirements.txt
   ```
3. Install Node dependencies:
   ```
   cd apps/desktop
   npm install
   ```

## Every Day Usage

- Double click `start.bat` to launch everything
- Double click `stop.bat` to stop everything

## Build .exe Installer

```
cd apps/desktop
npm run build:win
```

Installer will be at: `apps/desktop/dist-app/CodeBuddy Setup 1.0.0.exe`

## Hotkeys

| Key | Action |
|-----|--------|
| Ctrl+Shift+C | Capture screen |
| Ctrl+Shift+B | Hide/Show overlay |
| Enter | Send message |
