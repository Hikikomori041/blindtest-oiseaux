const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getMp3Files: (dir) => {
    const fs = require('fs');
    const path = require('path');
    try {
      const fullPath = path.join(__dirname, dir);
      const files = fs.readdirSync(fullPath);
      return files.filter(f => f.endsWith('.mp3')).map(f => `${dir}/${f}`);
    } catch (err) {
      console.error(`Erreur lecture dossier ${dir}:`, err);
      return [];
    }
  },
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
