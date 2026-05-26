const { app, BrowserWindow, ipcMain, globalShortcut, screen } = require('electron');
const path = require('path');

let mainWindow;
let isExpanded = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 400,
    height: 600,
    x: width - 420,
    y: height - 640,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: true,
    skipTaskbar: false,
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
}

app.whenReady().then(() => {
  createWindow();

  // Register global hotkey Ctrl+Shift+C to trigger capture
  globalShortcut.register('CommandOrControl+Shift+C', () => {
    mainWindow.webContents.send('trigger-capture');
  });

  // Register Ctrl+Shift+B to toggle visibility
  globalShortcut.register('CommandOrControl+Shift+B', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
    }
  });
});

// Handle screenshot capture from renderer
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

ipcMain.handle('minimize-app', () => mainWindow.minimize());
ipcMain.handle('hide-app', () => mainWindow.hide());
ipcMain.handle('close-app', () => app.quit());

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
