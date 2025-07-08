// Ici iront toutes les fonctions liées à la lecture de son
import { toggleSoundControls } from './controls.js';
import { log } from './strings.js'

// Permet de lire un son (victoire, défaire)
export function playSound({app}, son, volume=1.0) {
  // Si on ne joue pas les sons de confirmation, on skip
  if (app.confirmSoundMuted) return;

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

export function slideVolume({app}) {
  app.volume = volumeSlider.value;
  if (app.volume == 0 && !app.muted) muteAudio({app});
  else if (app.volume > 0) app.muted = false;
  changeAudio({app});
}

export function changeAudio({app}) {
  app.audio.volume = app.volume/100;
  window.api.updateThumbar(app.audio.paused, app.muted);
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
  volumeSlider.dataset.tooltip = volume + "%";
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
export function listenToBird({app}) {
  const variants = app.birdsData[app.currentBird]?.variants || [];

  if (variants.length > 0) {
    playBirdSound({app}, Math.floor(Math.random() * variants.length));
  }
}


function playBirdSound({app}, index = 0) {
  // app.audio.pause();
  stopAudio({app});
  const file = app.birdsData[app.currentBird].variants[index];
  app.audio.src = file;

  // On log l'oiseau lu pour le fun
  const fileName = decodeURI(new URL(file).pathname).split(/[\\/]/).slice(-2).join('\\'); // coupe sur \ ou /
  const message = "[oiseau] On écoute: \"" + fileName + "\"";
  log(message);
  // console.log(message);

  app.audio.dataset.name = app.currentBird;
  app.audio.dataset.index = index;
  app.audio.volume = app.volume/100;

  startAudio({app});
}

function startAudio({app}) {
  app.audio.preload = 'auto';
  app.audio.load();

  if (!app.autoplayAtStart && app.total == 0) {
    document.getElementById('pause-button-img').src = "../ressources/images/play-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
    window.api.updateThumbar(app.audio.paused, app.muted);
    return;
  };

  app.audio.oncanplaythrough = () => {
    app.audio.play().then(() => {
      document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
      document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
      window.api.updateThumbar(app.audio.paused, app.muted);
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  };
}


export function playNextVariant({app}) {
  const index = parseInt(app.audio.dataset.index || '0');
  const variants = app.birdsData[app.currentBird]?.variants || [];
  if (variants.length < 2) return;
  const next = (index + 1) % variants.length;
  playBirdSound({app}, next);
}


export function togglePause({app}) {
  if (app.audio.paused) {
    app.audio.play();
    document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
  } else {
    app.audio.pause();
    document.getElementById('pause-button-img').src = "../ressources/images/play-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
  window.api.updateThumbar(app.audio.paused, app.muted);
}

function stopAudio({app}) {
  app.audio.pause();
  app.audio.currentTime = 0;
  app.audio.src = "";
  // console.log("on stoppe et vide l'audio");
  window.api.updateThumbar(app.audio.paused, app.muted);
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
    stopAudio({app});

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

  app.currentBird = pool[index];
  // console.log("Oiseau à trouver:", app.currentBird);
  // console.log('---------------------------------------');
  // for (index in app.birdsData) { if (app.birdsData[index].playCount > 0) console.log(index, ":", app.birdsData[index].playCount); }

  listenToBird({app});
}

