// Ici iront toutes les fonctions liées à la lecture de son
import { toggleSoundControls } from './controls.js';
import { hidePopup } from './layout.js';

// Permet de lire un son (victoire, défaire)
export function playSound(son, volume=1.0) {
  const chemin = `../ressources/sons/${son}`;
  const audio = new Audio(chemin);
  audio.volume = volume; // de 0.0 à 1.0
  audio.preload = 'auto';
  audio.load();
  audio.oncanplaythrough = () => {
    audio.play();
  };
}



const volumeButton = document.getElementById('volume-button');
const volumeSlider = document.getElementById('volume-slider');

export function muteAudio({app}) {
  if (!app.muted) {
    app.lastVolume = app.volume;
    app.volume = 0;
    volumeButton.title = "Unmute (m)";
  } else {
    app.volume = app.lastVolume;
    if (app.volume == 0) app.volume = 10;
    volumeButton.title = "Mute (m)";
  }
  // console.log("volume:", app.volume, "lastVolume:", app.lastVolume);
  volumeSlider.value = parseInt(app.volume);
  app.muted = !app.muted;
  changeAudio({app});
}

export function slideVolume ({app}) {
  app.volume = volumeSlider.value;
  if (app.volume == 0 && !app.muted) muteAudio({app});
  else if (app.volume > 0) app.muted = false;
  changeAudio({app});
}

export function changeAudio({app}) {
  app.audio.volume = app.volume/100;
  updateVolumeGradient(app.volume);
}


// Met à jour la couleur du slider du volume
export function updateVolumeGradient(volume) {
  let volumeSlider = document.getElementById('volume-slider');
  const min = volumeSlider.min || 0;
  const max = volumeSlider.max || 100;
  const percent = ((volume - min) / (max - min)) * 100;

  volumeSlider.style.background = `linear-gradient(to right, #1db954 ${percent}%, #555 ${percent}%)`;
  volumeSlider.value = volume;
  volumeSlider.title = volume + "%";
  checkVolumeButtonIcon(volume);
}

export function toggleReplayMode({app}) {
  const replayModeButton = document.getElementById('replay-mode-button');
  app.replayMode = !app.replayMode;
  if (app.replayMode) {
    replayModeButton.classList.add("activated");
    replayModeButton.classList.remove("deactivated");

    if (app.audio.currentTime >= app.audio.duration) {
      app.audio.preload = 'auto';
      app.audio.load();
      app.audio.oncanplaythrough = () => {
        app.audio.play();
      };
    }
  }
  else {
    replayModeButton.classList.remove("activated");
    replayModeButton.classList.add("deactivated");
  }
}

export function checkVolumeButtonIcon(volume) {
  volumeButton.classList = "";
  if (volume >= 40) { volumeButton.classList.add("volume-3"); }
  else if (volume >= 10) { volumeButton.classList.add("volume-2"); }
  else if (volume >= 1) { volumeButton.classList.add("volume-1"); }
  else {volumeButton.classList.add('volume-muted'); }
}



// Écouter un oiseau
export function listenToBird(birdName, {app}) {
  const variants = app.birdsData[birdName]?.variants || [];

  if (variants.length > 0) {
    app.currentBird = birdName;
    playBirdSound(birdName, {app}, Math.floor(Math.random() * variants.length));
  }
}


function playBirdSound(name, {app}, index = 0) {
  app.audio.pause();
  app.currentBird = name;
  const file = app.birdsData[name].variants[index];
  app.audio.src = file;

  app.audio.dataset.name = name;
  app.audio.dataset.index = index;
  app.audio.volume = app.volume/100;

  app.audio.preload = 'auto';
  app.audio.load();
  app.audio.oncanplaythrough = () => {
    app.audio.play().then(() => {
      document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
      document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  };
  hidePopup();
}


export function playNextVariant({app}) {
  const name = app.currentBird;
  const index = parseInt(app.audio.dataset.index || '0');
  const variants = app.birdsData[name]?.variants || [];
  if (variants.length < 2) return;
  const next = (index + 1) % variants.length;
  playBirdSound(name, {app}, next);
}


export function togglePause({app}) {
  if (app.audio.paused) {
    app.audio.preload = 'auto';
    app.audio.load();
    app.audio.oncanplaythrough = () => {
      app.audio.play().then(() => {
        document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
        document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
      }).catch(err => {
        console.error("Erreur lecture :", err);
      });
    };
  } else {
    app.audio.pause();
    document.getElementById('pause-button-img').src = "../ressources/images/play-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
}



// Choisi un oiseau aléatoire à écouter
export function playRandomBird({app}) {
  // On choisi tous les oiseaux disponibles après le filtre, sauf le dernier écouté
  let pool = [];
  if (app.currentBird !== undefined) {
    pool = app.birdList.filter(b => b !== app.currentBird);
  } else {
    pool = app.birdList;
  }
  // Si aucun oiseau n'est disponible
  if (pool.length === 0) {
    app.audio.pause();
    app.audio.currentTime = 0;

    document.getElementById('titre').innerHTML = "Aucun oiseau n'est sélectionné !";

    // On désactive les commandes de son
    toggleSoundControls(false);
    document.getElementById('search-bar-control').style.display = 'none';
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
    return;
  } else {
    document.getElementById('titre').innerHTML = "Quel est cet oiseau ?";
    document.getElementById('search-bar-control').style.display = 'block';
    toggleSoundControls();
  }

  // Algorithme pour choisir un nouvel oiseau aléatoire à écouter
  // Calcul des poids
  const poids = pool.map(bird => 1 / (1 + (bird.playCount || 0)));

  // Calcul des probabilités normalisées
  const total = poids.reduce((a, b) => a + b, 0);
  const proba = poids.map(p => p / total);

  // Choisir un index aléatoire pondéré
  let r = Math.random();
  let cumule = 0;
  let index = 0;
  for (let i = 0; i < proba.length; i++) {
    cumule += proba[i];
    if (r < cumule) {
      index = i;
      break;
    }
  }

  // Ajoute une écoute à l'oiseau
  app.currentBird = pool[index];
  // console.log("Oiseau à trouver:", app.currentBird);
  // console.log('---------------------------------------');
  // for (index in app.birdsData) { if (app.birdsData[index].playCount > 0) console.log(index, ":", app.birdsData[index].playCount); }

  playBirdSound(app.currentBird, {app}, 0);
}

