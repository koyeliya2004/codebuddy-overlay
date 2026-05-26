const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  captureScreen: () => ipcRenderer.invoke('capture-screen'),
  minimizeApp: () => ipcRenderer.invoke('minimize-app'),
  hideApp: () => ipcRenderer.invoke('hide-app'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  onTriggerCapture: (callback) => {
    ipcRenderer.on('trigger-capture', callback);
  },
  removeTriggerCapture: () => {
    ipcRenderer.removeAllListeners('trigger-capture');
  }
});
