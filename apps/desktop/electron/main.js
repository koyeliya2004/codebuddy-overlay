const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');

let mainWindow;
let tray;
let pythonProcess;
let isVisible = true;

// ─── Start bundled Python server ───────────────────────────────────────────
function startPythonServer() {
  const isDev = !app.isPackaged;
  let pythonExe, serverScript;

  if (isDev) {
    // In dev mode use system Python
    pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    serverScript = path.join(__dirname, '../../..', 'server', 'main.py');
  } else {
    // In packaged app use bundled server script
    pythonExe = process.platform === 'win32' ? 'python' : 'python3';
    serverScript = path.join(process.resourcesPath, 'server', 'main.py');
  }

  console.log('Starting Python server:', pythonExe, serverScript);

  pythonProcess = spawn(pythonExe, ['-m', 'uvicorn', 'main:app', '--port', '8000', '--app-dir', path.dirname(serverScript)], {
    cwd: path.dirname(serverScript),
    env: { ...process.env },
    stdio: 'pipe'
  });

  pythonProcess.stdout.on('data', (data) => console.log('Server:', data.toString()));
  pythonProcess.stderr.on('data', (data) => console.log('Server ERR:', data.toString()));
  pythonProcess.on('close', (code) => console.log('Server exited with code', code));
}

// ─── Wait for server to be ready ──────────────────────────────────────────
function waitForServer(callback, tries = 0) {
  if (tries > 30) { callback(); return; }
  http.get('http://127.0.0.1:8000', () => callback())
    .on('error', () => setTimeout(() => waitForServer(callback, tries + 1), 500));
}

// ─── Create main overlay window ───────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 420,
    height: 620,
    x: width - 440,
    y: height - 660,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.setAlwaysOnTop(true, 'screen-saver');
  mainWindow.once('ready-to-show', () => mainWindow.show());
}

// ─── System Tray icon ──────────────────────────────────────────────────────
function createTray() {
  // Simple 16x16 robot icon as base64 PNG
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAX0lEQVQ4jWNgGAWDE/wnQO//fyINA8MABkIaGBgYGP7//08uTUQDAwMDAwMDEWomWQMDA8P/IWACIQMKBgYGBgYGBiI0DDgwMDCQ5oCRgYGBgYGBGLcMOAAA7e4P5ZPRQwAAAABJRU5ErkJggg==';
  const icon = nativeImage.createFromDataURL('data:image/png;base64,' + iconBase64);
  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    { label: '🤖 CodeBuddy', enabled: false },
    { type: 'separator' },
    { label: 'Show / Hide (Ctrl+Shift+B)', click: toggleWindow },
    { label: 'Capture Screen (Ctrl+Shift+C)', click: () => mainWindow?.webContents.send('trigger-capture') },
    { type: 'separator' },
    { label: 'Quit CodeBuddy', click: () => app.quit() }
  ]);

  tray.setToolTip('CodeBuddy AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) {
    mainWindow.hide();
    isVisible = false;
  } else {
    mainWindow.show();
    isVisible = true;
  }
}

// ─── App ready ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  startPythonServer();
  waitForServer(() => {
    createWindow();
    createTray();

    globalShortcut.register('CommandOrControl+Shift+C', () => {
      mainWindow?.webContents.send('trigger-capture');
    });

    globalShortcut.register('CommandOrControl+Shift+B', () => {
      toggleWindow();
    });
  });
});

// ─── IPC handlers ─────────────────────────────────────────────────────────
ipcMain.handle('capture-screen', async () => {
  try {
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    if (sources.length > 0) {
      const thumbnail = sources[0].thumbnail;
      const base64 = thumbnail.toDataURL().replace('data:image/png;base64,', '');
      return { success: true, base64, preview: thumbnail.toDataURL() };
    }
    return { success: false, error: 'No screen source found' };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('minimize-app', () => mainWindow?.minimize());
ipcMain.handle('hide-app', () => mainWindow?.hide());
ipcMain.handle('close-app', () => mainWindow?.hide()); // hide to tray, not quit

// ─── Cleanup ──────────────────────────────────────────────────────────────
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

app.on('window-all-closed', () => {
  // Do NOT quit - keep running in tray
});
