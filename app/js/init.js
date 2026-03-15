import { loadSettings, windowSetSize } from './settings.js';
import { bindAllButtons, loadTaskbarButtons } from './controls.js';
import { playRandomBird, updateVolumeGradient } from './player.js';
import { applySelectedTypes, applySelectedList, genererGrilleOiseaux, setTitleVersion, startProgressSmooth, updateTiles } from './layout.js';

let app = {}; // Paramètres de l'application

export async function loadApp() {
  setTitleVersion();

  // Chargement des paramètres de l'application
  try {
    app = await loadSettings();
  } catch (err) {
    console.error('ERREUR CHARGEMENT PARAMÈTRES:', err);
  }

  if (app.autoplayAtStart === undefined)      { app.autoplayAtStart = true; }
  if (app.birdsSize === undefined)            { app.birdsSize = "default"; }
  if (app.loadedList === undefined)           { app.loadedList = "default-list"; }
  if (app.validationSoundMuted === undefined) { app.validationSoundMuted = false; }

  app.audio = new Audio();
  app.score = 0;
  app.total = 0;
  app.currentBird = null;
  app.birdHasBeenPlayed = false;
  
  // Chargement des oiseaux
  app.birdsData = await window.api.getBirdsData('res://data/birds.json');
  app.myLists   = await window.api.getAllLists();

  // On génère enfin la grille des oiseaux à afficher
  await genererGrilleOiseaux({app});

  // Association des actions aux boutons
  bindAllButtons({app});

  // Application des paramètres de l'application

  applySelectedTypes({app});
  // await applySelectedList({app});
  startProgressSmooth(app.audio); // Pour l'animation du slider de l'audio
  updateVolumeGradient(app.volume);
  updateTiles({app});

  // La fenêtre s'affiche toute seule une fois la page chargée normalement (voir electron-main.js: "once('ready-to-show',...)")
  // On change la taille de la fenêtre
  windowSetSize(app.winWidth, app.winHeight);
  if (app.isMaximized) {
    window.api.maximize();
  }

  // On charge les boutons dans la barre des tâches
  loadTaskbarButtons({app});

  // On lance directement un son d'oiseau au démarrage (sauf si on a désactivé l'option)
  playRandomBird({app});

  // console.log('Paramètres:', app);
}

export async function getApp() {
  return app;
}