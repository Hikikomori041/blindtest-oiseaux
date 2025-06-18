const { app, BrowserWindow, ipcMain } = require('electron');
const fs = require('fs');
const path = require('path');
const { screen } = require('electron');

// Création de la fenêtre de l'application
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1300,
    height: 800,
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

  // Gestion de la fenêtre web
  win.loadFile('app/index.html');
  win.removeMenu();
  win.webContents.openDevTools(); // Affiche les outils développeurs 
  
  // win.setBounds(electron.screen.getPrimaryDisplay().workArea);
}

// Ouverture de la fenêtre (ça fait des courants d'air)
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
// À la fermeture de la fenêtre
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});



// Réception des événements envoyés depuis preload → renderer
// Fonctions des boutons de la bordure de fenêtre
ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});
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


ipcMain.on('window-close', () => {
  if (win) win.close();
});

// Sort les données du json
ipcMain.handle('get-birds-data', (event, filePath) => {
    const fullPath = path.join(__dirname, filePath);
    const jsonString = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(jsonString);
});


ipcMain.handle('get-mp3-paths', (event, oiseauName) => {
  const dirPath = path.join(__dirname, 'ressources', 'oiseaux', oiseauName);
  const files = fs.readdirSync(dirPath);
  const mp3Files = files.filter(file => file.endsWith('.mp3'));
  const fullPaths = mp3Files.map(file => 'file://' + path.join(dirPath, file));
  return fullPaths;
});