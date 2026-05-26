@echo off
title CodeBuddy Launcher
color 0A
echo.
echo  ==========================================
echo   CodeBuddy AI - Starting...
echo  ==========================================
echo.
echo  [1/2] Starting Python backend server...
start "CodeBuddy Server" cmd /k "cd /d C:\Users\Administrator\codebuddy-overlay\server && uvicorn main:app --port 8000"
echo  Waiting for server to start...
timeout /t 4 /nobreak >nul
echo  [2/2] Starting Desktop overlay...
start "CodeBuddy App" cmd /k "cd /d C:\Users\Administrator\codebuddy-overlay\apps\desktop && npm run dev"
echo.
echo  ==========================================
echo   CodeBuddy is running!
echo   Hotkeys:
echo     Ctrl+Shift+C = Capture screen
echo     Ctrl+Shift+B = Hide/Show overlay
echo  ==========================================
echo.
pause
