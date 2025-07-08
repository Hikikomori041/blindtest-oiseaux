const { contextBridge, ipcRenderer } = require('electron');

// Envoie tout à electron-main.js
contextBridge.exposeInMainWorld('api', {
  // Récupère la version de l'application
  getVersion: async () => {
    return await ipcRenderer.invoke('get-version');
  },
  // Vérifie s'il y a une mise à jour disponible
  checkUpdate: async () => {
    return await ipcRenderer.invoke('check-update');
  },

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
  saveSettings: (data) => ipcRenderer.invoke('save-settings', data),

  logMessage: (message) => ipcRenderer.invoke('log-message', message),
  showWindow: () => ipcRenderer.invoke('show-window'),

  // Pour les contrôles dans la barre des tâches
  onPlayerControl: (callback) => ipcRenderer.on('player-control', (event, action) => callback(action)),
  updateThumbar: (isPlaying, isMuted) => ipcRenderer.send('update-thumbar', isPlaying, isMuted),

  // Pour la fenêtre de mises à jour
  onProgress: (callback) => ipcRenderer.on('update-progress', (event, percent) => callback(percent))
});
