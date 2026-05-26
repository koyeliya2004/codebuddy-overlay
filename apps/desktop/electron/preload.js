const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  setPosition: (x, y) => ipcRenderer.invoke('set-position', x, y),
  getPosition: () => ipcRenderer.invoke('get-position'),
  getScreenSize: () => ipcRenderer.invoke('get-screen-size'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  hideApp: () => ipcRenderer.invoke('hide-app'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  onTriggerCapture: (callback) => ipcRenderer.on('trigger-capture', callback),
  removeTriggerCapture: () => ipcRenderer.removeAllListeners('trigger-capture'),
});
