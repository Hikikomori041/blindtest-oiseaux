import { platform } from './platform/index.js';
import { loadSettings } from './settings.js';
import { bindAllButtons, loadTaskbarButtons } from './controls.js';
import { playRandomBird, updateVolumeGradient } from './player.js';
import { applySelectedTypes, genererGrilleOiseaux, setTitleVersion, startProgressSmooth, updateTiles } from './layout.js';

let app = {}; // Paramètres de l'application

export async function loadApp() {
  setTitleVersion();

  // Chargement des paramètres de l'application (complétés par les valeurs par défaut)
  app = await loadSettings();

  app.audio = new Audio();
  app.score = 0;
  app.total = 0;
  app.currentBird = null;
  app.birdHasBeenPlayed = false;

  // Chargement des oiseaux
  app.birdsData = await platform.loadBirdsData();
  app.myLists   = await platform.getAllLists();

  // On applique les types sauvegardés au DOM avant de générer la grille,
  // pour que getSelectedTypes() lise le bon état depuis les settings.
  applySelectedTypes({app});

  // On génère ensuite la grille des oiseaux à afficher
  await genererGrilleOiseaux({app});

  // Association des actions aux boutons
  bindAllButtons({app});
  // await applySelectedList({app});
  startProgressSmooth(app.audio); // Pour l'animation du slider de l'audio
  updateVolumeGradient(app.volume);
  updateTiles({app});

  // La fenêtre s'affiche toute seule une fois la page chargée normalement (voir electron-main.js: "once('ready-to-show',...)")
  // On change la taille de la fenêtre
  if (app.winWidth && app.winHeight) {
    platform.resizeWindow(app.winWidth, app.winHeight);
  }
  if (app.isMaximized) {
    platform.toggleMaximizeWindow();
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
