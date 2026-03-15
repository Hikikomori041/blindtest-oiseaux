const { app, BrowserWindow, ipcMain, globalShortcut, net, nativeImage, protocol } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const settingsPath = path.join(app.getPath('userData'), 'settings.json');
const logPath = path.join(app.getPath('userData'), 'logs', 'main.log');
const assetsCachePath = path.join(app.getPath('userData'), 'assets');

const BIRDS_INDEX_URL = 'https://raw.githubusercontent.com/Hikikomori041/blindtest-oiseaux/main/assets/data/birds-index.json';
const BIRDS_INDEX_FALLBACK_URL = 'https://github.com/Hikikomori041/blindtest-oiseaux/raw/refs/heads/main/assets/data/birds-index.json';
const BIRDS_INDEX_LOCAL_PATH = path.join(assetsCachePath, 'birds-index.local.json');
const BIRDS_INDEX_ETAG_PATH  = path.join(assetsCachePath, 'birds-index.etag');
const DEFAULT_BIRDS_BASE_URL = 'https://github.com/Hikikomori041/blindtest-oiseaux/raw/refs/heads/main/';
const ASSETS_BUNDLED_ROOT = path.join(__dirname, 'assets');
const BIRDS_BUNDLED_ROOT = path.join(__dirname, 'birds');

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'res',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
]);

app.setAppUserModelId(process.execPath);

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
let updateWindow = null;
let isAppUpdateDownloadActive = false;

function createUpdateWindow(initialStatus = 'Mise a jour en cours...') {
  if (updateWindow) return; // éviter les doublons

  // Pendant un téléchargement, on minimise le splash pour éviter une fenêtre bloquée derrière.
  if (splash && !splash.isDestroyed() && !splash.isMinimized()) {
    splash.minimize();
  }

  updateWindow = new BrowserWindow({
    width: 350,
    height: 100,
    frame: false,
    resizable: false,
    alwaysOnTop: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  updateWindow.loadFile('app/update.html');

  updateWindow.webContents.once('did-finish-load', () => {
    updateWindow.webContents.send('update-status', initialStatus);
  });

  updateWindow.on('closed', () => {
    updateWindow = null;
    // Stopper uniquement le téléchargement de mise a jour applicative
    if (isAppUpdateDownloadActive) {
      try {
        autoUpdater.cancelDownload();
        console.log("✅ Téléchargement annulé proprement après fermeture de la fenêtre.");
      } catch (err) {
        console.error("❌ Erreur lors de l'annulation du téléchargement :", err);
      }
    }
    autoUpdater.removeListener('download-progress', downloadProgressHandler);
  });
}

// MAJ la progression
const downloadProgressHandler = (progressObj) => {
  if (!updateWindow || updateWindow.isDestroyed()) {
    return;
  }
  logMessage(`[download]📥 Download progress: ${(progressObj.percent).toFixed(2)}%`);
  const pct = progressObj.percent;
  if (updateWindow.webContents.isLoading() === false) {
    updateWindow.webContents.send('update-progress', pct);
    updateWindow.webContents.send('update-status', `Téléchargement... ${pct.toFixed(0)} %`);
  } else {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow.webContents.send('update-progress', pct);
      updateWindow.webContents.send('update-status', `Téléchargement... ${pct.toFixed(0)} %`);
    });
  }
};
autoUpdater.on('download-progress', downloadProgressHandler);


autoUpdater.on('update-available', () => {
  isAppUpdateDownloadActive = true;
  createUpdateWindow('Mise a jour de l application...');
});

autoUpdater.on('update-not-available', () => {
  isAppUpdateDownloadActive = false;
  if (updateWindow) {
    updateWindow.close();
    updateWindow = null;
  }
});

autoUpdater.on('update-downloaded', () => {
  isAppUpdateDownloadActive = false;
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
    alwaysOnTop: false,
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
    icon: resolveAssetPath('images/oiseau.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

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

  app.whenReady().then(async () => {
    cleanUpdaterFiles();
    log.info("Démarrage de l'application");

    registerAssetProtocol();

    createSplashWindow();
    createMainWindow();

    try {
      await ensureBirdsAvailable();
    } catch (err) {
      log.error('[Birds] Echec de synchronisation:', err);
    }

    win.loadFile('app/index.html');
    win.removeMenu();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
        win.loadFile('app/index.html');
        win.removeMenu();
      }
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

    volume: 100,
    muted: false,
    lastVolume: 100,
    replayMode: true,

    autoplayAtStart: true,
    birdsSize: "default",
    loadedList: "default-list",
    selectedTypes: ['commun', 'eau', 'foret', 'montagne', 'plaine'],
    validationSoundMuted: false,
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
  const fullPath = resolveAssetPath(filePath);
    const jsonString = fs.readFileSync(fullPath, 'utf-8');
    return JSON.parse(jsonString);
});

// Trouve les fichiers .mp3
ipcMain.handle('get-mp3-paths', (event, oiseauName) => {
  const dirPath = resolveAssetPath(path.join('birds', oiseauName));
  const files = fs.readdirSync(dirPath);
  const mp3Files = files.filter(file => file.endsWith('.mp3'));
  const fullPaths = mp3Files.map(file => pathToFileURL(path.join(dirPath, file)).toString());
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
ipcMain.handle('get-all-lists', (event) => {
  try {
    const dir = path.join(app.getPath('userData'), 'my_lists');
    if (!fs.existsSync(dir)) {
      return {}; // pas de listes
    }

    const files = fs.readdirSync(dir)
      .filter(f => /^list-.*\.json$/i.test(f));

    const lists = {};

    for (const file of files) {
      try {
        const id = file.replace(/^list-/, '').replace(/\.json$/i, '');
        const filePath = path.join(dir, file);
        const content = fs.readFileSync(filePath, 'utf8');
        lists[id] = JSON.parse(content);
      } catch (err) {
        console.error(`Erreur lecture liste ${file}:`, err);
      }
    }

    return lists; // { id1: {...}, id2: {...}, ... }
  } catch (err) {
    console.error('get-all-lists error:', err);
    return { ok: false, error: String(err) };
  }
});



// Sauvegarde une liste en .json
ipcMain.handle('save-list', (event, listId, list) => {
  try {
    if (typeof listId !== 'string' || !listId.trim()) {
      throw new Error('listId invalide');
    }

    // eslint-disable-next-line no-control-regex
    const safeId = listId.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_').slice(0, 128);
    const dir = path.join(app.getPath('userData'), 'my_lists');

    fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, `${safeId}.json`);
    const tmpPath  = `${filePath}.tmp`;

    fs.writeFileSync(tmpPath, JSON.stringify(list ?? {}, null, 2), 'utf8');
    fs.renameSync(tmpPath, filePath);

    return { ok: true, path: filePath };
  } catch (err) {
    console.error('save-list error:', err);
    return { ok: false, error: String(err) };
  }
});

// Supprime la liste .json
ipcMain.handle('delete-list', (event, listId) => {
  try {
    if (typeof listId !== 'string' || !listId.trim()) {
      throw new Error('listId invalide');
    }

    // eslint-disable-next-line no-control-regex
    const safeId = listId.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_').slice(0, 128);
    const dir = path.join(app.getPath('userData'), 'my_lists');
    const filePath = path.join(dir, `${safeId}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Liste introuvable: ${safeId}`);
    }

    fs.unlinkSync(filePath);

    return { ok: true };
  } catch (err) {
    console.error('delete-list error:', err);
    return { ok: false, error: String(err) };
  }
});


// Récupère le contenu d'une liste depuis son .json
ipcMain.handle('get-list', (event, listId) => {
  try {
    if (typeof listId !== 'string' || !listId.trim()) {
      throw new Error('listId invalide');
    }

    // eslint-disable-next-line no-control-regex
    const safeId = listId.replace(/[<>:"/\\|?*\x00-\x1F]+/g, '_').slice(0, 128);
    const dir = path.join(app.getPath('userData'), 'my_lists');
    const filePath = path.join(dir, `${safeId}.json`);

    if (!fs.existsSync(filePath)) {
      throw new Error(`Liste introuvable: ${safeId}`);
    }

    const jsonString = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(jsonString);
  } catch (err) {
    console.error('get-list error:', err);
    return { ok: false, error: String(err) };
  }
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
    ? resolveAssetPath('images/pause-button.png')
    : resolveAssetPath('images/play-button.png');

  const muteTooltip = isMuted ? "Unmute" : "Mute";
  const muteIconPath = isMuted
    ? resolveAssetPath('images/volume-muted-black.png')
    : resolveAssetPath('images/volume-3-black.png');

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

function normalizeAssetRelativePath(relativePath) {
  const candidate = String(relativePath || '').replace(/\\/g, '/');
  const cleaned = candidate
    .replace(/^res:\/\//, '')
    .replace(/^\/+/, '')
    .replace(/^assets\//, '');
  if (cleaned.includes('..')) {
    throw new Error(`Chemin ressource invalide: ${relativePath}`);
  }
  return cleaned;
}

function resolveAssetPath(relativePath) {
  const rel = normalizeAssetRelativePath(relativePath);
  if (rel.startsWith('birds/')) {
    const birdRelative = rel.substring('birds/'.length);
    const cachedBirdFile = path.join(assetsCachePath, 'birds', birdRelative);
    if (fs.existsSync(cachedBirdFile)) {
      return cachedBirdFile;
    }

    const bundledBirdFile = path.join(BIRDS_BUNDLED_ROOT, birdRelative);
    if (fs.existsSync(bundledBirdFile)) {
      return bundledBirdFile;
    }
  }

  return path.join(ASSETS_BUNDLED_ROOT, rel);
}

function registerAssetProtocol() {
  protocol.handle('res', (request) => {
    try {
      const url = new URL(request.url);
      // Avec res://images/foo.png, "images" est dans host (pas dans pathname).
      const hostSegment = url.host ? `${url.host}/` : '';
      const pathSegment = (url.pathname || '').replace(/^\/+/, '');
      const requestedPath = decodeURIComponent(`${hostSegment}${pathSegment}`);
      const filePath = resolveAssetPath(requestedPath);
      return net.fetch(pathToFileURL(filePath).toString());
    } catch (err) {
      log.error('[Assets] Protocole res:// erreur:', err);
      return new Response('Not found', { status: 404 });
    }
  });
}

function sendUpdateStatus(statusText) {
  if (!updateWindow) {
    return;
  }
  if (updateWindow.webContents.isLoading() === false) {
    updateWindow.webContents.send('update-status', statusText);
  } else {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow.webContents.send('update-status', statusText);
    });
  }
}

function sendUpdateProgress(percent) {
  if (!updateWindow) {
    return;
  }
  if (updateWindow.webContents.isLoading() === false) {
    updateWindow.webContents.send('update-progress', percent);
  } else {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow.webContents.send('update-progress', percent);
    });
  }
}

function sendUpdateDetail(detailText) {
  if (!updateWindow) return;
  if (updateWindow.webContents.isLoading() === false) {
    updateWindow.webContents.send('update-detail', detailText);
  } else {
    updateWindow.webContents.once('did-finish-load', () => {
      updateWindow.webContents.send('update-detail', detailText);
    });
  }
}

// Variante avec support ETag : renvoie { notModified:true } sur 304,
// ou { data, etag } sur 200.
function fetchJsonWithEtag(url, savedEtag) {
  return new Promise((resolve, reject) => {
    const request = net.request(url);
    if (savedEtag) {
      request.setHeader('If-None-Match', savedEtag);
    }
    request.on('response', (response) => {
      const statusCode = Number(response.statusCode || 0);
      const etag = String(response.headers?.etag || response.headers?.['etag'] || '');

      if (statusCode === 304) {
        resolve({ notModified: true });
        return;
      }

      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        if (statusCode < 200 || statusCode >= 300) {
          const excerpt = String(body || '').slice(0, 140).replace(/\s+/g, ' ').trim();
          reject(new Error(`HTTP ${statusCode} pour ${url}${excerpt ? ` | ${excerpt}` : ''}`));
          return;
        }
        try {
          resolve({ data: JSON.parse(body), etag });
        } catch (err) {
          const excerpt = String(body || '').slice(0, 140).replace(/\s+/g, ' ').trim();
          reject(new Error(`Réponse non-JSON pour ${url}${excerpt ? ` | ${excerpt}` : ''}`));
        }
      });
    });
    request.on('error', reject);
    request.end();
  });
}

function downloadFile(url, destinationPath, onProgress, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(destinationPath), { recursive: true });
    const fileStream = fs.createWriteStream(destinationPath);
    const request = net.request(url);
    let settled = false;
    let timer = null;

    const abort = (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { request.abort(); } catch { /* ignore */ }
      fileStream.destroy();
      reject(err);
    };

    timer = setTimeout(() => {
      abort(new Error(`Timeout (${timeoutMs} ms) pour : ${url}`));
    }, timeoutMs);

    request.on('response', (response) => {
      const statusCode = Number(response.statusCode || 0);
      if (statusCode < 200 || statusCode >= 300) {
        abort(new Error(`HTTP ${statusCode} pour : ${url}`));
        return;
      }

      const totalBytes = Number(response.headers['content-length'] || 0);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        fileStream.write(chunk);
        if (totalBytes > 0 && typeof onProgress === 'function') {
          onProgress((downloadedBytes / totalBytes) * 100);
        }
      });

      response.on('end', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fileStream.end();
        fileStream.once('finish', resolve);
      });
    });

    request.on('error', (err) => abort(err));
    request.end();
  });
}

async function downloadFileWithRetry(url, destinationPath, maxRetries = 3, timeoutMs = 30000) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (fs.existsSync(destinationPath)) {
        fs.rmSync(destinationPath, { force: true });
      }
      await downloadFile(url, destinationPath, undefined, timeoutMs);
      return;
    } catch (err) {
      lastErr = err;
      log.warn(`[Birds] Tentative ${attempt}/${maxRetries} échouée : ${err.message}`);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }
  throw lastErr;
}

function normalizeBirdIndexPath(relativePath) {
  const rel = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel.startsWith('birds/') || rel.includes('..')) {
    throw new Error(`Chemin birds invalide dans l'index: ${relativePath}`);
  }
  return rel;
}

function getBirdNameFromRelativePath(relativePath) {
  const normalized = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  return parts[0] === 'birds' && parts[1] ? parts[1] : normalized;
}

function buildRemoteBirdFileUrl(baseUrl, relativePath) {
  const cleanBase = String(baseUrl || DEFAULT_BIRDS_BASE_URL).replace(/\/+$/, '');
  const encodedPath = String(relativePath || '')
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `${cleanBase}/${encodedPath}`;
}

function computeFileSha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

function removeEmptyParentDirs(startDir, stopDir) {
  let current = startDir;
  while (current.startsWith(stopDir) && current !== stopDir) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }
    if (fs.readdirSync(current).length > 0) {
      break;
    }
    fs.rmdirSync(current);
    current = path.dirname(current);
  }
}

async function ensureBirdsAvailable() {
  fs.mkdirSync(assetsCachePath, { recursive: true });

  let localManifest = { version: '', files: {} };
  if (fs.existsSync(BIRDS_INDEX_LOCAL_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(BIRDS_INDEX_LOCAL_PATH, 'utf8'));
      localManifest = {
        version: String(parsed?.version || ''),
        files: parsed?.files && typeof parsed.files === 'object' ? parsed.files : {}
      };
    } catch (err) {
      log.warn('[Birds] Index local invalide, sera régénéré:', err);
    }
  }

  const buildManifestFromLocalIndex = () => {
    const files = Object.entries(localManifest.files || {}).map(([relPath, meta]) => ({
      path: relPath,
      size: Number(meta?.size || 0),
      sha256: String(meta?.sha256 || '').toLowerCase()
    }));
    return {
      version: localManifest.version || '',
      baseUrl: DEFAULT_BIRDS_BASE_URL,
      files
    };
  };

  // ETag : éviter de re-télécharger birds-index.json si le fichier distant est inchangé
  let savedEtag = '';
  if (fs.existsSync(BIRDS_INDEX_ETAG_PATH)) {
    try { savedEtag = fs.readFileSync(BIRDS_INDEX_ETAG_PATH, 'utf8').trim(); } catch { /* ignore */ }
  }

  let remoteManifest = {};
  let newEtag = '';
  try {
    const result = await fetchJsonWithEtag(BIRDS_INDEX_URL, savedEtag);
    if (result.notModified) {
      const localEntriesCount = Object.keys(localManifest.files || {}).length;
      if (localEntriesCount > 0) {
        // Important: même avec 304, on doit vérifier/réparer les fichiers locaux manquants.
        remoteManifest = buildManifestFromLocalIndex();
        log.info('[Birds] birds-index.json inchangé (304), vérification locale maintenue.');
      } else {
        // Pas d'index local exploitable: forcer un fetch complet de l'index distant.
        const fullResult = await fetchJsonWithEtag(BIRDS_INDEX_URL, '');
        remoteManifest = fullResult.data;
        newEtag = fullResult.etag;
      }
    } else {
      remoteManifest = result.data;
      newEtag = result.etag;
    }
  } catch (err) {
    const is404 = String(err?.message || '').includes('HTTP 404');
    if (!is404) {
      log.warn('[Birds] birds-index.json indisponible:', err);
      return;
    }

    log.warn('[Birds] 404 sur URL primaire, tentative fallback:', BIRDS_INDEX_FALLBACK_URL);
    try {
      const fallbackResult = await fetchJsonWithEtag(BIRDS_INDEX_FALLBACK_URL, savedEtag);
      if (fallbackResult.notModified) {
        const localEntriesCount = Object.keys(localManifest.files || {}).length;
        if (localEntriesCount > 0) {
          remoteManifest = buildManifestFromLocalIndex();
          log.info('[Birds] birds-index inchangé (304 via fallback), vérification locale maintenue.');
        } else {
          const fullFallback = await fetchJsonWithEtag(BIRDS_INDEX_FALLBACK_URL, '');
          remoteManifest = fullFallback.data;
          newEtag = fullFallback.etag;
        }
      } else {
        remoteManifest = fallbackResult.data;
        newEtag = fallbackResult.etag;
      }
    } catch (fallbackErr) {
      log.warn('[Birds] birds-index.json indisponible (fallback échoué):', fallbackErr);
      return;
    }
  }

  const indexFiles = Array.isArray(remoteManifest.files) ? remoteManifest.files : [];
  if (indexFiles.length === 0) {
    log.warn('[Birds] birds-index.json vide ou invalide.');
    return;
  }

  const baseUrl = String(remoteManifest.baseUrl || DEFAULT_BIRDS_BASE_URL).trim();
  const toAdd    = []; // fichiers absents localement
  const toUpdate = []; // fichiers présents mais modifiés
  const expectedPaths = new Set();

  for (const file of indexFiles) {
    const relPath = normalizeBirdIndexPath(file?.path);
    expectedPaths.add(relPath);

    const localPath = path.join(assetsCachePath, relPath);
    const expectedHash = String(file?.sha256 || '').toLowerCase();
    const expectedSize = Number(file?.size || 0);
    const localMeta = localManifest.files[relPath] || null;

    const hasFile = fs.existsSync(localPath);
    const hasRightSize = !expectedSize || (hasFile && fs.statSync(localPath).size === expectedSize);
    const hasKnownHash = Boolean(localMeta?.sha256) && localMeta.sha256 === expectedHash;

    if (!hasFile || !hasRightSize || !hasKnownHash) {
      const entry = {
        relPath,
        sha256: expectedHash,
        size: expectedSize,
        url: file?.url ? String(file.url) : buildRemoteBirdFileUrl(baseUrl, relPath)
      };
      if (!hasFile) {
        toAdd.push(entry);
      } else {
        toUpdate.push(entry);
      }
    }
  }

  const toDownload = [...toAdd, ...toUpdate];
  const stalePaths = Object.keys(localManifest.files).filter((relPath) => !expectedPaths.has(relPath));

  if (toDownload.length === 0 && stalePaths.length === 0) {
    // Rien à faire – on sauvegarde quand même le nouvel ETag
    if (newEtag) fs.writeFileSync(BIRDS_INDEX_ETAG_PATH, newEtag, 'utf8');
    return;
  }

  const addedBirds = new Set(toAdd.map((file) => getBirdNameFromRelativePath(file.relPath)));
  const updatedBirds = new Set(toUpdate.map((file) => getBirdNameFromRelativePath(file.relPath)));
  const deletedBirds = new Set(stalePaths.map((relPath) => getBirdNameFromRelativePath(relPath)));

  // Construire la ligne de détail en nombre d'oiseaux
  const detailParts = [];
  if (addedBirds.size > 0) detailParts.push(addedBirds.size === 1 ? '1 nouvel oiseau' : `${addedBirds.size} nouveaux oiseaux`);
  if (updatedBirds.size > 0) detailParts.push(updatedBirds.size === 1 ? '1 oiseau mis à jour' : `${updatedBirds.size} oiseaux mis à jour`);
  if (deletedBirds.size > 0) detailParts.push(deletedBirds.size === 1 ? '1 oiseau supprimé' : `${deletedBirds.size} oiseaux supprimés`);

  const downloadsByBird = new Map();
  for (const file of toDownload) {
    const birdName = getBirdNameFromRelativePath(file.relPath);
    if (!downloadsByBird.has(birdName)) {
      downloadsByBird.set(birdName, []);
    }
    downloadsByBird.get(birdName).push(file);
  }

  const staleByBird = new Map();
  for (const relPath of stalePaths) {
    const birdName = getBirdNameFromRelativePath(relPath);
    if (!staleByBird.has(birdName)) {
      staleByBird.set(birdName, []);
    }
    staleByBird.get(birdName).push(relPath);
  }

  const birdsToProcess = [...new Set([...downloadsByBird.keys(), ...staleByBird.keys()])].sort((a, b) => a.localeCompare(b));

  createUpdateWindow('Mise à jour des oiseaux');
  sendUpdateDetail(detailParts.join(' · '));

  const totalBirds = birdsToProcess.length;
  let doneBirds = 0;

  const markProgress = (birdName) => {
    doneBirds += 1;
    sendUpdateStatus(`(${doneBirds}/${totalBirds}) ${birdName}`);
    sendUpdateProgress((doneBirds / totalBirds) * 100);
  };

  try {
    for (const birdName of birdsToProcess) {
      const filesForBird = downloadsByBird.get(birdName) || [];
      const staleForBird = staleByBird.get(birdName) || [];

      // Télécharge tous les fichiers de l'oiseau en parallèle.
      await Promise.all(filesForBird.map(async (file) => {
        const destinationPath = path.join(assetsCachePath, file.relPath);
        const tmpPath = `${destinationPath}.tmp`;
        await downloadFileWithRetry(file.url, tmpPath);

        if (file.sha256) {
          const actualHash = await computeFileSha256(tmpPath);
          if (actualHash !== file.sha256) {
            throw new Error(`Hash invalide pour ${file.relPath}`);
          }
        }

        if (fs.existsSync(destinationPath)) {
          fs.rmSync(destinationPath, { force: true });
        }
        fs.renameSync(tmpPath, destinationPath);
        localManifest.files[file.relPath] = {
          sha256: file.sha256,
          size: file.size,
          updatedAt: new Date().toISOString()
        };
      }));

      for (const relPath of staleForBird) {
        const localPath = path.join(assetsCachePath, relPath);
        if (fs.existsSync(localPath)) {
          fs.rmSync(localPath, { force: true });
          removeEmptyParentDirs(path.dirname(localPath), path.join(assetsCachePath, 'birds'));
        }
        delete localManifest.files[relPath];
      }

      markProgress(birdName);
    }

    localManifest.version = String(remoteManifest.version || remoteManifest.assetsVersion || '');
    fs.writeFileSync(BIRDS_INDEX_LOCAL_PATH, JSON.stringify(localManifest, null, 2), 'utf8');
    if (newEtag) fs.writeFileSync(BIRDS_INDEX_ETAG_PATH, newEtag, 'utf8');
    sendUpdateStatus('Oiseaux à jour !');
    sendUpdateDetail('');
  } finally {
    const tmpFiles = toDownload.map((file) => `${path.join(assetsCachePath, file.relPath)}.tmp`);
    for (const tmpPath of tmpFiles) {
      if (fs.existsSync(tmpPath)) {
        fs.rmSync(tmpPath, { force: true });
      }
    }

    if (!isAppUpdateDownloadActive && updateWindow && !updateWindow.isDestroyed()) {
      setTimeout(() => {
        if (updateWindow && !updateWindow.isDestroyed()) {
          updateWindow.close();
        }
      }, 1000);
    }
  }
}





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
