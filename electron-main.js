const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 720,
    minWidth: 1024,
    minHeight: 720,
    // resizable: false,
    frame: false,
    icon: path.join(__dirname, 'ressources/images/oiseau.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile('app/index.html');
  win.removeMenu();
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 🔧 Réception des événements envoyés depuis preload → renderer
ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});
ipcMain.on('window-maximize', () => {
  if (win) {
    win.isMaximized() ? win.unmaximize() : win.maximize();
  }
});
ipcMain.on('window-close', () => {
  if (win) win.close();
});

ipcMain.handle('get-birds-data', (event, filePath) => {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(__dirname, filePath);
    const jsonString = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(jsonString);
});

ipcMain.handle('get-folder-list', (event, dir) => {
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(__dirname, dir);
    const files = fs.readdirSync(fullPath, { withFileTypes: true });
    return files.filter(f => f.isDirectory()).map(f => f.name);
});


ipcMain.handle('get-mp3-files', (event, birdName) => {
    const fs = require('fs');
    const path = require('path');

    const resolvedDir = path.resolve(__dirname, '../ressources/oiseaux', birdName);

    console.log('Lecture MP3 dans :', resolvedDir);

    try {
        const files = fs.readdirSync(resolvedDir, { withFileTypes: true });

        console.log('Fichiers trouvés :', files.map(f => f.name));

        const mp3s = files
            .filter(f => f.isFile() && f.name.toLowerCase().endsWith('.mp3'))
            .map(f => `../ressources/oiseaux/${birdName}/${f.name}`);

        console.log('MP3 trouvés :', mp3s);

        return mp3s;
    } catch (err) {
        console.error(`Erreur lecture MP3 ${resolvedDir}:`, err);
        return [];
    }
});
