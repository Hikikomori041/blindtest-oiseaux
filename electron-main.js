const { app, BrowserWindow, ipcMain, globalShortcut, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';


const fs = require('fs');
const path = require('path');
const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');
try {
  fs.unlinkSync(logPath);
  console.log('✅ Log effacé au démarrage');
} catch (err) {
  // pas grave si le fichier n'existe pas encore
}


const DEFAULT_WIDTH = 1300;
const DEFAULT_HEIGHT = 750;

let win;
let logOn = false;
const consoleShortCutEnabled = true;

// Création de la fenêtre de l'application
function createWindow() {
  win = new BrowserWindow({
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
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
  log.info('Application démarre...');
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // Pour activer la console développeur
  globalShortcut.register('Control+I', () => {
    if (consoleShortCutEnabled) {
      if (!logOn) win.webContents.openDevTools(); // Affiche les outils développeurs
      else win.webContents.closeDevTools(); // Cache les outils développeurs
      logOn = !logOn;
    }
  });


  ipcMain.handle('load-settings', async () => {
    const settingsDefault = {
      isMaximized: false,
      winWidth: DEFAULT_WIDTH,
      winHeight: DEFAULT_HEIGHT,
      replayMode: true,
      lastVolume: 100,
      volume: 100,
      muted: false,
      confirmSoundMuted: false,
      selectedTypes: ['commun', 'eau', 'foret', 'plaine']
    };
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

  log.info('check-update appelé');
  autoUpdater.checkForUpdatesAndNotify();
});
// À la fermeture de la fenêtre
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
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



// Vérifie s'il y a une mise à jour disponible
ipcMain.handle('check-update', async () => {
  return new Promise((resolve, reject) => {
    const request = net.request('https://raw.githubusercontent.com/Hikikomori041/blindtest-oiseaux/main/package.json');
    request.on('response', (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          const remotePackage = JSON.parse(body);
          resolve(remotePackage.version);
        } catch (err) {
          reject(err);
        }
      });
    });
    request.on('error', (err) => {
      reject(err);
    });
    request.end();
  });
});



// Vérifie la mise à jour en fonction du dernier tag release
// ipcMain.handle('check-update', async () => {
//   return new Promise((resolve, reject) => {
//     const request = net.request('https://api.github.com/repos/Hikikomori041/blindtest-oiseaux/releases/latest');
//     request.setHeader('User-Agent', 'BlindTestOiseaux');
//     request.on('response', (response) => {
//       let body = '';
//       response.on('data', (chunk) => { body += chunk; });
//       response.on('end', () => {
//         try {
//           const apiResponse = JSON.parse(body);
//           let remoteVersion = apiResponse.tag_name;

//           // Nettoie "v" devant si besoin
//           if (remoteVersion.startsWith('v')) {
//             remoteVersion = remoteVersion.substring(1);
//           }

//           resolve(remoteVersion);
//         } catch (err) {
//           reject(err);
//         }
//       });
//     });
//     request.on('error', (err) => {
//       reject(err);
//     });
//     request.end();
//   });
// });
