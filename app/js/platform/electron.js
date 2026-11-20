// Implémentation Electron de la plateforme : tout passe par window.api (preload.js → electron-main.js)

export const electronPlatform = {
  name: 'electron',
  isDesktop: true,

  // La synchro des oiseaux est faite par electron-main.js avant l'affichage de la fenêtre
  init: async () => {},

  // ── Ressources ──
  // Chemin relatif à assets/ ou à birds/ (ex. "images/play-button.png", "birds/Merle noir/image.jpg").
  // Le protocole res:// résout d'abord le cache userData, puis les fichiers embarqués.
  resourceUrl: (relativePath) => `res://${relativePath}`,

  loadBirdsData: () => window.api.getBirdsData('res://data/birds.json'),
  getSoundUrls: (birdName) => window.api.getMp3Paths(birdName),

  // ── Liens externes ──
  // setWindowOpenHandler (electron-main.js) les ouvre dans le navigateur par défaut
  openLink: (url) => { window.open(url, '_blank'); },

  // ── Version ──
  getVersion: () => window.api.getVersion(),
  getRemoteVersion: () => window.api.checkUpdate(),

  // ── Paramètres utilisateur ──
  loadSettings: () => window.api.loadSettings(),
  saveSettings: (data) => window.api.saveSettings(data),

  // ── Listes personnalisées ──
  // getAllLists renvoie { "<n>": {name, birds} } (id sans le préfixe "list-")
  getAllLists: () => window.api.getAllLists(),
  saveList: (listId, list) => window.api.saveList(listId, list),
  deleteList: (listId) => window.api.deleteList(listId),

  // ── Fenêtre ──
  closeWindow: () => window.api.close(),
  minimizeWindow: () => window.api.minimize(),
  toggleMaximizeWindow: () => window.api.maximize(),
  onMaximizeChange: (callback) => {
    window.api.onWindowMaximize(() => callback(true));
    window.api.onWindowUnmaximize(() => callback(false));
  },
  resizeWindow: (width, height) => { window.resizeTo(width, height); },
  toggleFullscreen: () => window.api.toggleFullscreen(),

  // ── Spécifique mobile (sans objet sur desktop) ──
  onBackButton: () => {},
  minimizeApp: () => window.api.minimize(),
  getOfflineSoundsInfo: () => null,
  setAutoDownloadSounds: () => {},

  // ── Contrôles média (boutons de la barre des tâches) ──
  updateMediaState: (isPaused, isMuted) => window.api.updateThumbar(isPaused, isMuted),
  onMediaControl: (callback) => window.api.onPlayerControl(callback),

  // ── Journal ──
  log: (message) => window.api.logMessage(message),
};
