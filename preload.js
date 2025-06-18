const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  
  getBirdsData: (filePath) => ipcRenderer.invoke('get-birds-data', filePath),
  getFolderList: (dir) => ipcRenderer.invoke('get-folder-list', dir),
  getMp3Files: (dir) => ipcRenderer.invoke('get-mp3-files', dir),


  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),

});