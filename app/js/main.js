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
  app.score = 0;
  app.total = 0;
  app.currentBird = null;
  app.birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');

  // Association des actions aux boutons
  bindAllButtons({ app, audio });

  // Application des paramètres de l'application
  applySelectedTypes(app.selectedTypes);
  updateVolumeGradient(app.volume);
  startProgressSmooth(audio); // pour l'animation du slider du volume

  if (app.isMaximized) {
    window.api.maximize();
  }

  // On génère enfin la grille des oiseaux à afficher
  await genererGrilleOiseaux({app, audio});

  // On lance directement un son d'oiseau au démarrage
  playRandomBird({app, audio});
})
