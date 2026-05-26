@echo off
title CodeBuddy Stop
color 0C
echo Stopping CodeBuddy...
taskkill /f /im uvicorn.exe >nul 2>&1
taskkill /f /im electron.exe >nul 2>&1
taskkill /f /im node.exe >nul 2>&1
echo CodeBuddy stopped!
pause
