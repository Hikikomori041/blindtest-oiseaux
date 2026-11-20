import { platform } from './platform/index.js';
import { getSelectedTypes } from './strings.js';

// Valeurs par défaut (complétées par celles du fichier de paramètres, s'il existe)
const DEFAULT_SETTINGS = {
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

export async function loadSettings() {
  let settings = {};
  try {
    settings = await platform.loadSettings();
  } catch (err) {
    console.error('ERREUR CHARGEMENT PARAMÈTRES:', err);
  }
  return { ...DEFAULT_SETTINGS, ...settings };
}

// Enregistre les paramètres actuels de l'application
export async function saveAppSettings({app}) {
  await platform.saveSettings({
    isMaximized: app.isMaximized,
    winWidth: app.winWidth,
    winHeight: app.winHeight,

    volume: app.volume,
    muted: app.muted,
    lastVolume: app.lastVolume,
    replayMode: app.replayMode,

    autoplayAtStart: app.autoplayAtStart,
    birdsSize: app.birdsSize,
    loadedList: app.loadedList,
    selectedTypes: getSelectedTypes(),
    validationSoundMuted: app.validationSoundMuted,
  });
}
