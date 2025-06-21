const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');

const logOn = true;

// Création de la fenêtre de l'application
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 800,
    minWidth: 1024,
    minHeight: 750,
    // resizable: false,
    frame: false,
    icon: path.join(__dirname, 'ressources/images/oiseau.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  // Gestion de la fenêtre web
  win.loadFile('app/index.html');
  win.removeMenu();
  if (logOn) win.webContents.openDevTools(); // Affiche les outils développeurs

  win.on('maximize', () => {
    win.webContents.send('window-maximize');

    // Dès que la fenêtre est ready, on enlève le focus actif (souvent sur le minimize)
    win.webContents.once('did-finish-load', () => {
    win.webContents.focus(); // force le focus général
    win.webContents.executeJavaScript(`document.activeElement && document.activeElement.blur();`);
});

  });

  win.on('unmaximize', () => {
    win.webContents.send('window-unmaximize');
  });
}

// Ouverture de la fenêtre (ça fait des courants d'air)
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });


  ipcMain.handle('load-settings', async () => {
    const settingsDefault = { isMaximized: false, replayMode: true, lastVolume: 100, muted: false, selectedTypes: ['commun', 'eau', 'plaine'] };
    try {
      if (fs.existsSync(settingsPath)) {
        const raw = fs.readFileSync(settingsPath);
        return JSON.parse(raw);
      } else {
        return settingsDefault;
      }
  } catch (e) {
    console.error('Erreur lecture parametres utilisateurs:', e);
    return settingsDefault;
    }
  });

  ipcMain.handle('save-settings', async (event, data) => {
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
      console.log('Parametres utilisateurs sauvegardes avec succes !');
    } catch (e) {
      console.error('Erreur sauvegarde parametres utilisateurs:', e);
    }
  });
});
// À la fermeture de la fenêtre
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



// Réception des événements envoyés depuis preload → renderer
// Fonctions des boutons de la bordure de fenêtre

ipcMain.on('window-close', () => {
  if (win) win.close();
});

ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});

// Pour agrandir / réduire la fenêtre
let ignoreNext = false;
ipcMain.on('window-toggle-maximize', () => {
  if (!win || ignoreNext) return;
  ignoreNext = true;
  if (win.isMaximized()) {
    win.unmaximize();
  } else {
    win.maximize();
  }
  setTimeout(() => {
    ignoreNext = false;
  }, 300); // délai pour laisser le temps à l’animation native
});


// Sort les données du json
ipcMain.handle('get-birds-data', (event, filePath) => {
    const fullPath = path.join(__dirname, filePath);
    const jsonString = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(jsonString);
});

// Trouve les fichiers .mp3
ipcMain.handle('get-mp3-paths', (event, oiseauName) => {
  const dirPath = path.join(__dirname, 'ressources', 'oiseaux', oiseauName);
  const files = fs.readdirSync(dirPath);
  const mp3Files = files.filter(file => file.endsWith('.mp3'));
  const fullPaths = mp3Files.map(file => 'file://' + path.join(dirPath, file));
  return fullPaths;
});


// Récupère la version de l'application depuis package.json
ipcMain.handle('get-version', () => {
  return app.getVersion();
});