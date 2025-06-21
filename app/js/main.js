import { loadSettings } from './settings.js';
import { bindAllButtons} from './buttons.js';
import { playRandomBird, updateVolumeGradient} from './player.js';
import { applySelectedTypes, genererGrilleOiseaux, setTitleVersion, startProgressSmooth } from './layout.js';

const audio = new Audio();

let app = {}; // Paramètres de l'application


document.addEventListener('DOMContentLoaded', async () => {
  setTitleVersion();

  // Chargement des paramètres de l'application
  try {
    app = await loadSettings();
    // console.log('Paramètres:', app);
  } catch (err) {
    console.error('ERREUR CHARGEMENT PARAMÈTRES:', err);
  }
  
  // Chargement des oiseaux
  app.audio = new Audio();
  app.score = 0;
  app.total = 0;
  app.currentBird = null;
  app.birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');

  // Association des actions aux boutons
  bindAllButtons({ app });

  // Application des paramètres de l'application
  applySelectedTypes(app.selectedTypes);
  updateVolumeGradient(app.volume);
  startProgressSmooth(app.audio); // pour l'animation du slider du volume

  // On change la taille de la fenêtre
  windowSetSize(app.winWidth, app.winHeight);
  if (app.isMaximized) {
    window.api.maximize();
  }

  // On génère enfin la grille des oiseaux à afficher
  await genererGrilleOiseaux({app});

  // On lance directement un son d'oiseau au démarrage
  playRandomBird({app});
})
