const { app, BrowserWindow, ipcMain, globalShortcut, net, nativeImage } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const fs = require('fs');
const path = require('path');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');

app.setAppUserModelId(process.execPath);

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
let updateWindow = null;

function createUpdateWindow() {
  if (updateWindow) return; // éviter les doublons

  updateWindow = new BrowserWindow({
    width: 400,
    height: 120,
    frame: false,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  updateWindow.loadFile('app/update.html');

  updateWindow.on('closed', () => {
    updateWindow = null;
    // Stopper le téléchargement proprement
    try {
      autoUpdater.cancelDownload();
      console.log("✅ Téléchargement annulé proprement après fermeture de la fenêtre.");
    } catch (err) {
      console.error("❌ Erreur lors de l'annulation du téléchargement :", err);
    }
    autoUpdater.removeListener('download-progress', downloadProgressHandler);
  });
}

// MAJ la progression
const downloadProgressHandler = (progressObj) => {
  logMessage(`[download]📥 Download progress: ${(progressObj.percent).toFixed(2)}%`);
  if (updateWindow && updateWindow.webContents.isLoading() === false) {
    // logMessage(`Envoi à updateWindow: ${(progressObj.percent).toFixed(2)}%`);
    updateWindow.webContents.send('update-progress', progressObj.percent);
  } else {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow.webContents.send('update-progress', progressObj.percent);
    });
  }
};
autoUpdater.on('download-progress', downloadProgressHandler);


autoUpdater.on('update-available', () => {
  createUpdateWindow();
});

autoUpdater.on('update-not-available', () => {
  if (updateWindow) {
    updateWindow.close();
    updateWindow = null;
  }
});

autoUpdater.on('update-downloaded', () => {
  if (updateWindow) {
    updateWindow.close();
    updateWindow = null;
  }
  autoUpdater.quitAndInstall();
});

try {
  fs.unlinkSync(logPath);
  console.log('✅ Log effacé au démarrage');
} catch (err) {
  // pas grave si le fichier n'existe pas encore
}

function logMessage(message) {
  const now = new Date().toISOString();
  fs.appendFileSync(logPath, `[${now}] ${message}\n`);
}


const DEFAULT_WIDTH = 1300;
const DEFAULT_HEIGHT = 750;

let splash, win;
let consoleOn = false;
const consoleShortCutEnabled = true;

// Création de la fenêtre "splash" avant l'app
function createSplashWindow() {
  splash = new BrowserWindow({
    width: 240, height: 240,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
  });
  splash.loadFile('app/splash.html');

  return splash;
}

// Création de la fenêtre de l'application
function createMainWindow() {
  win = new BrowserWindow({
    show: false,
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
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    cleanUpdaterFiles();
    log.info("Démarrage de l'application");

    createSplashWindow();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
    });

    // Pour activer la console développeur
    globalShortcut.register('Control+I', () => {
      if (consoleShortCutEnabled) {
        if (!consoleOn) win.webContents.openDevTools(); // Affiche les outils développeurs
        else win.webContents.closeDevTools(); // Cache les outils développeurs
        consoleOn = !consoleOn;
      }
    });

    log.info('Vérification des mises à jour...');
    
    if (!app.isPackaged) {
      console.log('🚫 Update skipped: app not packaged.');
    } else {
      autoUpdater.checkForUpdates();
    }

    log.info('Vérification terminée !');
    
    // On cache la fenêtre de chargement et on affiche la fenêtre principale
    win.once('ready-to-show', () => {
      if (splash && !splash.isDestroyed()) {
        splash.close();
      }
      win.show();
      setThumbar(true, true);
    });

  });

  // À la fermeture de la fenêtre
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}



// Réception des événements envoyés depuis preload → renderer

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
    autoplayAtStart: true,
    selectedTypes: ['commun', 'eau', 'foret', 'plaine'],
    loadedList: "default-list"
  };
  try {
    if (fs.existsSync(settingsPath)) {
      const raw = fs.readFileSync(settingsPath);
      return JSON.parse(raw);
    } else {
      return settingsDefault;
    }
} catch (e) {
  console.error('Erreur lecture paramètres utilisateurs:', e);
  return settingsDefault;
  }
});

ipcMain.handle('save-settings', async (event, data) => {
  try {
    fs.writeFileSync(settingsPath, JSON.stringify(data, null, 2));
    console.log('Paramètres utilisateurs sauvegardés avec succes !');
  } catch (e) {
    console.error('Erreur sauvegarde paramètres utilisateurs:', e);
  }
});

// Fonctions des boutons de la bordure de fenêtre
ipcMain.on('window-close', () => {
  if (updateWindow && !updateWindow.isDestroyed())  updateWindow.close();
  if (splash && !splash.isDestroyed()) splash.close();
  if (win) win.close();
});

ipcMain.on('window-minimize', () => {
  if (win) win.minimize();
});
ipcMain.on('window-minimize-update', () => {
  if (updateWindow) {
    updateWindow.minimize();
  }
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

// Récupère le nom d'une liste
ipcMain.handle('get-list-name', (event, listId) => {
  if (listId === "default-list") return "Tous les oiseaux";

  const filePath = path.join(app.getPath('userData'), "my_lists", `${listId}.json`);
  const jsonString = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(jsonString).name;
});

// Récupère les listes
ipcMain.handle('get-lists-data', (event) => {
  //todo: faire cette fonction
  const fullPath = path.join(__dirname, "my_lists");
  const jsonString = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(jsonString);
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

ipcMain.handle('log-message', (event, message) => {
  logMessage(message);
});

ipcMain.on('update-thumbar', (event, isPlaying, isMuted) => {
  setThumbar(isPlaying, isMuted);
});

function setThumbar(isPlaying = true, isMuted = true) {
  const pauseTooltip = !isPlaying ? "Pause" : "Play";
  const pauseIconPath = !isPlaying
    ? path.join(__dirname, 'ressources/images/pause-button.png')
    : path.join(__dirname, 'ressources/images/play-button.png');

  const muteTooltip = isMuted ? "Unmute" : "Mute";
  const muteIconPath = isMuted
    ? path.join(__dirname, 'ressources/images/volume-muted-black.png')
    : path.join(__dirname, 'ressources/images/volume-3-black.png');

    win.setThumbarButtons([
    {
      tooltip: pauseTooltip,
      icon: nativeImage.createFromPath(pauseIconPath),
      click () {
        win.webContents.send('player-control', 'play-pause');
      }
    },
    {
      tooltip: muteTooltip,
      icon: nativeImage.createFromPath(muteIconPath),
      click () {
        win.webContents.send('player-control', 'mute-unmute');
      }
    }
  ]);
}


ipcMain.handle("toggle-fullscreen", (event) => {
  const focusedWin = BrowserWindow.getFocusedWindow();
  if (focusedWin) {
    const newState = !focusedWin.isFullScreen();
    focusedWin.setFullScreen(newState);
    return newState;
  }
  return false;
});





// Suppression automatique des fichiers de mises à jours au démarrage de l'application
function cleanUpdaterFiles() {
  const updaterPath = path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
    'blindtest-oiseaux-updater'
  );

  // Supprimer l'exe racine
  const installerExe = path.join(updaterPath, 'installer.exe');
  if (fs.existsSync(installerExe)) {
    log.info("[Updater Cleanup] Suppression des fichiers de mises à jour...");
    try {
      fs.unlinkSync(installerExe);
      log.info('[Updater Cleanup] Supprimé : installer.exe');
    } catch (err) {
      log.error('[Updater Cleanup] Échec suppression installer.exe:', err);
    }
  }

  // Supprimer les fichiers dans "pending"
  const pendingDir = path.join(updaterPath, 'pending');
  if (fs.existsSync(pendingDir)) {
    fs.readdirSync(pendingDir).forEach(file => {
      try {
        fs.unlinkSync(path.join(pendingDir, file));
        log.info(`[Updater Cleanup] Supprimé dans pending : ${file}`);
      } catch (err) {
        log.error(`[Updater Cleanup] Échec suppression ${file} :`, err);
      }
    });
  }
}


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
