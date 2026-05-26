const { app, BrowserWindow, ipcMain, globalShortcut, screen, Tray, Menu, nativeImage } = require('electron');
const path = require('path');

let mainWindow;
let tray;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  mainWindow = new BrowserWindow({
    width: 400,
    height: 650,
    x: width - 420,
    y: Math.floor((height - 650) / 2),
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

function createTray() {
  const iconBase64 = 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABmJLR0QA/wD/AP+gvaeTAAAAX0lEQVQ4jWNgGAWDE/wnQO//fyINA8MABkIaGBgYGP7//08uTUQDAwMDAwMDEWomWQMDA8P/IWACIQMKBgYGBgYGBiI0DDgwMDCQ5oCRgYGBgYGBGLcMOAAA7e4P5ZPRQwAAAABJRU5ErkJggg==';
  const icon = nativeImage.createFromDataURL('data:image/png;base64,' + iconBase64);
  tray = new Tray(icon);
  const contextMenu = Menu.buildFromTemplate([
    { label: '✨ Buddy AI', enabled: false },
    { type: 'separator' },
    { label: 'Show / Hide  (Ctrl+Shift+B)', click: toggleWindow },
    { label: 'Capture Screen (Ctrl+Shift+C)', click: () => mainWindow?.webContents.send('trigger-capture') },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray.setToolTip('Buddy AI Assistant');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleWindow);
}

function toggleWindow() {
  if (!mainWindow) return;
  if (mainWindow.isVisible()) mainWindow.hide();
  else mainWindow.show();
}

// Hide window BEFORE capture so it doesn't appear in screenshot
ipcMain.handle('capture-screen', async () => {
  try {
    mainWindow.hide();
    await new Promise(r => setTimeout(r, 300));
    const { desktopCapturer } = require('electron');
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 }
    });
    mainWindow.show();
    if (sources.length > 0) {
      return { success: true, preview: sources[0].thumbnail.toDataURL() };
    }
    return { success: false, error: 'No screen source' };
  } catch (err) {
    mainWindow?.show();
    return { success: false, error: err.message };
  }
});

// Move window to position
ipcMain.handle('set-position', (_, x, y) => {
  mainWindow?.setPosition(Math.round(x), Math.round(y));
});

ipcMain.handle('get-position', () => {
  return mainWindow?.getPosition() || [0, 0];
});

ipcMain.handle('get-screen-size', () => {
  return screen.getPrimaryDisplay().workAreaSize;
});

ipcMain.handle('minimize-app', () => mainWindow?.minimize());
ipcMain.handle('hide-app', () => mainWindow?.hide());
ipcMain.handle('close-app', () => mainWindow?.hide());

app.whenReady().then(() => {
  createWindow();
  createTray();
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    mainWindow?.webContents.send('trigger-capture');
  });
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    toggleWindow();
  });
});

app.on('will-quit', () => globalShortcut.unregisterAll());
app.on('window-all-closed', () => { /* keep in tray */ });
