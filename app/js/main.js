import { loadSettings, windowSetSize } from './settings.js';
import { bindAllButtons, loadTaskbarButtons } from './controls.js';
import { playRandomBird, togglePause, updateVolumeGradient } from './player.js';
import { applySelectedTypes, genererGrilleOiseaux, setTitleVersion, startProgressSmooth, updateTiles } from './layout.js';

document.addEventListener('DOMContentLoaded', async () => {
  let app = {}; // Paramètres de l'application
  setTitleVersion();

  // Chargement des paramètres de l'application
  try {
    app = await loadSettings();
  } catch (err) {
    console.error('ERREUR CHARGEMENT PARAMÈTRES:', err);
  }
  
  // Chargement des oiseaux
  app.audio = new Audio();
  app.score = 0;
  app.total = 0;
  app.currentBird = null;
  if (app.confirmSoundMuted === undefined) { app.confirmSoundMuted = false; }
  if (app.autoplayAtStart === undefined) { app.autoplayAtStart = true; }
  
  app.birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  
  // console.log('Paramètres:', app);

  // Association des actions aux boutons
  bindAllButtons({app});

  // Application des paramètres de l'application
  applySelectedTypes(app.selectedTypes);
  updateVolumeGradient(app.volume);
  startProgressSmooth(app.audio); // Pour l'animation du slider de l'audio
  updateTiles({app});

  // On change la taille de la fenêtre
  windowSetSize(app.winWidth, app.winHeight);
  if (app.isMaximized) {
    window.api.maximize();
  }

  // On génère enfin la grille des oiseaux à afficher
  await genererGrilleOiseaux({app});

  // On affiche la fenêtre une fois que tout est chargé correctement
  window.api.showWindow();

  // On charge les boutons dans la barre des tâches
  loadTaskbarButtons({app});

  // On lance directement un son d'oiseau au démarrage (sauf si on a désactivé l'option)
  playRandomBird({app});
})
