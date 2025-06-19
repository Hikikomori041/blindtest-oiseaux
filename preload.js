const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Fonctions utilisées pour le programme -> envoie tout à electron-main.js
  getBirdsData: (filePath) => ipcRenderer.invoke('get-birds-data', filePath),
  getMp3Paths: (oiseauName) => ipcRenderer.invoke('get-mp3-paths', oiseauName),

  // Boutons de la fenêtre -> envoie tout à electron-main.js
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),

  maximize: () => ipcRenderer.send('window-toggle-maximize'),
  onWindowMaximize: (callback) => ipcRenderer.on('window-maximize', callback),
  onWindowUnmaximize: (callback) => ipcRenderer.on('window-unmaximize', callback)
});