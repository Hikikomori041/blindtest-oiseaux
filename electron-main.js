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
