const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

contextBridge.exposeInMainWorld('api', {
  getMp3Files: (dir) => {
    try {
      const fullPath = path.join(__dirname, dir);
      const files = fs.readdirSync(fullPath);
      return files.filter(f => f.endsWith('.mp3')).map(f => `${dir}/${f}`);
    } catch (err) {
      console.error(`Erreur lecture dossier ${dir}:`, err);
      return [];
    }
  }
});
