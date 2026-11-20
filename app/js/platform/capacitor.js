// Implémentation Android (Capacitor) de la plateforme.
//
// Pas de bundler : @capacitor/core est copié dans www/js/platform/vendor/ par scripts/build-mobile.js,
// et les plugins sont récupérés par leur nom avec registerPlugin (leur code natif est ajouté par `cap sync`).
//
// Oiseaux : birds.json et birds-index.json sont relus sur GitHub (branche main) à chaque démarrage.
// Un fichier d'oiseau déjà téléchargé est lu localement, sinon directement depuis GitHub (streaming).
// En tâche de fond : suppression des fichiers obsolètes, téléchargement des images, puis des sons en Wi-Fi.

import { Capacitor, registerPlugin } from './vendor/capacitor-core.js';

const Filesystem   = registerPlugin('Filesystem');
const Preferences  = registerPlugin('Preferences');
const App          = registerPlugin('App');
const AppLauncher  = registerPlugin('AppLauncher');
const Network      = registerPlugin('Network');
const FileTransfer = registerPlugin('FileTransfer');

const DATA = 'DATA'; // Directory.Data : stockage interne de l'appli
const UTF8 = 'utf8';

const REPO_RAW_URL = 'https://raw.githubusercontent.com/Hikikomori041/blindtest-oiseaux/main/';
const BIRDS_DATA_CACHE  = 'data/birds.json';
const BIRDS_INDEX_CACHE = 'data/birds-index.json';
const LOCAL_FILES_KEY = 'birds-local-files'; // Preferences : { "birds/X/f.mp3": sha256 } des fichiers téléchargés
const AUTO_DOWNLOAD_KEY = 'auto-download-sounds'; // Preferences : téléchargement des sons en Wi-Fi
const SETTINGS_KEY = 'settings';
const FETCH_TIMEOUT_MS = 8000;

let dataDirUri = '';      // file:///data/user/0/<appId>/files
let localFiles = {};      // fichiers d'oiseaux présents localement → sha256
let remoteFiles = {};     // fichiers attendus (birds-index.json) → sha256
let soundsByBird = {};    // nom de l'oiseau → chemins relatifs des sons
let syncRunning = false;
let autoDownloadSounds = true;

const isSound = (relativePath) => /\.mp3$/i.test(relativePath);

// ── Utilitaires ──

function encodePath(relativePath) {
  return relativePath.split('/').map(encodeURIComponent).join('/');
}

function remoteUrl(relativePath) {
  return REPO_RAW_URL + encodePath(relativePath);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status} pour ${url}`);
    return response;
  } finally {
    clearTimeout(timer);
  }
}

// Récupère un JSON distant (et le met en cache), sinon la copie en cache
async function fetchJsonWithCache(url, cachePath) {
  try {
    const response = await fetchWithTimeout(url, { cache: 'no-cache' });
    const text = await response.text();
    const data = JSON.parse(text);
    await Filesystem.writeFile({ path: cachePath, directory: DATA, data: text, encoding: UTF8, recursive: true });
    return data;
  } catch (err) {
    console.warn(`[Sync] ${url} indisponible (${err.message}), utilisation du cache`);
    const { data } = await Filesystem.readFile({ path: cachePath, directory: DATA, encoding: UTF8 });
    return JSON.parse(data);
  }
}

async function readJsonPreference(key, fallback) {
  try {
    const { value } = await Preferences.get({ key });
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function writeJsonPreference(key, value) {
  return Preferences.set({ key, value: JSON.stringify(value) });
}

function isLocal(relativePath) {
  const sha = localFiles[relativePath];
  if (!sha) return false;
  // Si l'index est connu, le fichier local doit être à jour
  return !remoteFiles[relativePath] || remoteFiles[relativePath] === sha;
}

// ── Synchro des fichiers d'oiseaux ──

function indexSoundsByBird(paths) {
  soundsByBird = {};
  for (const relativePath of paths) {
    const match = /^birds\/([^/]+)\/[^/]+\.mp3$/i.exec(relativePath);
    if (!match) continue;
    (soundsByBird[match[1]] ||= []).push(relativePath);
  }
  for (const list of Object.values(soundsByBird)) list.sort((a, b) => a.localeCompare(b));
}

async function loadBirdsIndex() {
  try {
    const index = await fetchJsonWithCache(REPO_RAW_URL + 'assets/data/birds-index.json', BIRDS_INDEX_CACHE);
    remoteFiles = {};
    for (const file of index.files || []) remoteFiles[file.path] = file.sha256;
  } catch (err) {
    console.warn('[Sync] Aucun index des oiseaux disponible:', err.message);
    remoteFiles = {};
  }
  const knownPaths = Object.keys(remoteFiles).length > 0 ? Object.keys(remoteFiles) : Object.keys(localFiles);
  indexSoundsByBird(knownPaths);
}

const createdDirectories = new Set(); // dossiers dont on sait qu'ils existent

function parentDirectory(relativePath) {
  return relativePath.split('/').slice(0, -1).join('/');
}

async function downloadBirdFile(relativePath) {
  const directory = parentDirectory(relativePath);
  if (!createdDirectories.has(directory)) {
    // Rejeté si le dossier existe déjà : sans importance
    await Filesystem.mkdir({ path: directory, directory: DATA, recursive: true }).catch(() => {});
    createdDirectories.add(directory);
  }
  const { uri } = await Filesystem.getUri({ path: relativePath, directory: DATA });
  await FileTransfer.downloadFile({ url: remoteUrl(relativePath), path: uri, shouldEncodeUrlParams: false });
  localFiles[relativePath] = remoteFiles[relativePath];
}

async function isOnWifi() {
  try {
    const status = await Network.getStatus();
    return status.connected && status.connectionType === 'wifi';
  } catch {
    return false;
  }
}

async function syncBirdFiles() {
  if (syncRunning || Object.keys(remoteFiles).length === 0) return;
  syncRunning = true;
  let changes = 0;
  const persist = async (force = false) => {
    if (changes > 0 && (force || changes % 10 === 0)) await writeJsonPreference(LOCAL_FILES_KEY, localFiles);
  };

  try {
    // 1. Fichiers supprimés ou modifiés sur GitHub
    for (const relativePath of Object.keys(localFiles)) {
      if (remoteFiles[relativePath] === localFiles[relativePath]) continue;
      await Filesystem.deleteFile({ path: relativePath, directory: DATA }).catch(() => {});
      delete localFiles[relativePath];
      changes++;
    }
    await persist(true);

    // 2. Images (légères), puis sons seulement en Wi-Fi et si l'option est activée
    const missing = Object.keys(remoteFiles).filter(p => !isLocal(p));
    const images = missing.filter(p => !isSound(p));
    const sounds = missing.filter(isSound);

    for (const queue of [images, sounds]) {
      if (queue === sounds && !(autoDownloadSounds && await isOnWifi())) break;
      for (const relativePath of queue) {
        if (queue === sounds && !autoDownloadSounds) break; // option désactivée en cours de route
        try {
          await downloadBirdFile(relativePath);
          changes++;
          await persist();
        } catch (err) {
          console.warn(`[Sync] Échec du téléchargement de ${relativePath}:`, err?.message || err);
        }
      }
    }
  } finally {
    await persist(true);
    syncRunning = false;
  }
}

// ── Plateforme ──

export const capacitorPlatform = {
  name: 'android',
  isDesktop: false,

  async init() {
    dataDirUri = (await Filesystem.getUri({ path: '', directory: DATA })).uri.replace(/\/+$/, '');
    autoDownloadSounds = await readJsonPreference(AUTO_DOWNLOAD_KEY, true);
    localFiles = await readJsonPreference(LOCAL_FILES_KEY, {});
    for (const relativePath of Object.keys(localFiles)) createdDirectories.add(parentDirectory(relativePath));
    await loadBirdsIndex();

    // Synchro en tâche de fond (et reprise quand le Wi-Fi revient)
    syncBirdFiles();
    Network.addListener('networkStatusChange', (status) => {
      if (status.connected) syncBirdFiles();
    });
  },

  resourceUrl(relativePath) {
    if (relativePath.startsWith('birds/')) {
      return isLocal(relativePath)
        ? Capacitor.convertFileSrc(`${dataDirUri}/${encodePath(relativePath)}`)
        : remoteUrl(relativePath);
    }
    // Ressources de l'interface : copiées à la racine de www/ par scripts/build-mobile.js
    return relativePath;
  },

  async loadBirdsData() {
    try {
      return await fetchJsonWithCache(REPO_RAW_URL + 'assets/data/birds.json', BIRDS_DATA_CACHE);
    } catch {
      // Premier lancement hors ligne : version embarquée dans l'APK
      return (await fetch('data/birds.json')).json();
    }
  },

  async getSoundUrls(birdName) {
    return (soundsByBird[birdName] || []).map(p => capacitorPlatform.resourceUrl(p));
  },

  openLink(url) {
    AppLauncher.openUrl({ url }).catch(err => console.error('Ouverture du lien impossible:', err));
  },

  async getVersion() {
    return (await App.getInfo()).version;
  },

  async getRemoteVersion() {
    const response = await fetchWithTimeout(REPO_RAW_URL + 'package.json', { cache: 'no-cache' });
    return (await response.json()).version;
  },

  loadSettings: () => readJsonPreference(SETTINGS_KEY, {}),
  saveSettings: (data) => writeJsonPreference(SETTINGS_KEY, data),

  // Listes : une préférence par liste, clé "list-<n>" (même format que les fichiers desktop)
  async getAllLists() {
    const { keys } = await Preferences.keys();
    const lists = {};
    for (const key of keys.filter(k => /^list-/.test(k))) {
      const list = await readJsonPreference(key, null);
      if (list) lists[key.replace(/^list-/, '')] = list;
    }
    return lists;
  },
  async saveList(listId, list) {
    await writeJsonPreference(listId, list ?? {});
    return { ok: true };
  },
  async deleteList(listId) {
    await Preferences.remove({ key: listId });
    return { ok: true };
  },

  // ── Spécifique mobile ──
  onBackButton(callback) {
    // Remplace le comportement par défaut (fermer l'appli)
    App.addListener('backButton', () => callback());
  },
  minimizeApp() {
    App.minimizeApp();
  },
  getOfflineSoundsInfo() {
    const sounds = Object.keys(remoteFiles).filter(isSound);
    return {
      autoDownload: autoDownloadSounds,
      downloaded: sounds.filter(isLocal).length,
      total: sounds.length,
    };
  },
  setAutoDownloadSounds(enabled) {
    autoDownloadSounds = enabled;
    writeJsonPreference(AUTO_DOWNLOAD_KEY, enabled);
    if (enabled) syncBirdFiles();
  },

  // Pas de fenêtre ni de barre des tâches sur mobile
  closeWindow() {},
  minimizeWindow() {},
  toggleMaximizeWindow() {},
  onMaximizeChange() {},
  resizeWindow() {},
  toggleFullscreen: async () => false,
  updateMediaState() {},
  onMediaControl() {},

  log: (message) => console.log(message),
};
