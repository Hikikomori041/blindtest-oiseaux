const { contextBridge, ipcRenderer } = require('electron');

// Envoie tout à electron-main.js
contextBridge.exposeInMainWorld('api', {
  // Boutons de la fenêtre
  minimize: () => ipcRenderer.send('window-minimize'),
  close: () => ipcRenderer.send('window-close'),
  maximize: () => ipcRenderer.send('window-toggle-maximize'),
  onWindowMaximize: (callback) => ipcRenderer.on('window-maximize', callback),
  onWindowUnmaximize: (callback) => ipcRenderer.on('window-unmaximize', callback),


  // Pour charger les fichiers ressources
  getBirdsData: (filePath) => ipcRenderer.invoke('get-birds-data', filePath),
  getMp3Paths: (oiseauName) => ipcRenderer.invoke('get-mp3-paths', oiseauName),

  
  // Pour enregistrer les données utilisateur (localement)
  loadSettings: () => ipcRenderer.invoke('load-settings'),
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data)
});
