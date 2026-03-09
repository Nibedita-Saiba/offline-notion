const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
  selectImage: () => ipcRenderer.invoke('select-image'),
  saveImage: (data) => ipcRenderer.invoke('save-image', data),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  getBackendPort: () => ipcRenderer.invoke('get-backend-port'),
  platform: process.platform,
});
