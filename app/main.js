import { slugify, getSelectedTypes } from './js/strings.js';
import { loadSettings } from './js/settings.js';
import { searchBird, clearSearch } from './js/search.js';
import { bindAllButtons } from './js/buttons.js';

let app = {}; // Paramètres de l'application

let birdsData = {};
let birdList = [];
let currentBird = null;
let score = 0;
let total = 0;

const audio = new Audio();


document.addEventListener('DOMContentLoaded', async () => {
  // Chargement des paramètres de l'application
  try {
    app = await loadSettings();
    // console.log('Paramètres:', app);
  } catch (err) {
    console.error('ERREUR CHARGEMENT PARAMÈTRES:', err);
  }

  // Chargement des oiseaux
  birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  await genererGrilleOiseaux();

  // Association des actions aux boutons
  bindAllButtons({ app, audio });

  // Application des paramètres de l'application
  applySelectedTypes(app.selectedTypes);
  updateVolumeGradient(app.volume);
  if (app.isMaximized) {
    window.api.maximize();
  }

  // On lance directement un son d'oiseau au démarrage
  playRandomBird();
})






// Clic ailleurs → on ferme le menu
document.addEventListener('click', () => {
  document.getElementById('context-menu').style.display = 'none';
  document.getElementById('more-menu').style.display = 'none';
});


audio.addEventListener('ended', () => {
  if (app.replayMode) {
    togglePause();
  } else {
    pauseButtonImg.src = "../ressources/images/play-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
});

const volumeButton = document.getElementById('volume-button');
const volumeSlider = document.getElementById('volume-slider');

export function muteAudio() {
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
  changeAudio(app.volume);
}

export function slideVolume () {
  app.volume = volumeSlider.value;
  if (app.volume == 0 && !app.muted) muteAudio();
  else if (app.volume > 0) app.muted = false;
  changeAudio(app.volume);
}

function changeAudio(volume) {
  audio.volume = volume/100;
  updateVolumeGradient(volume);
}

// Met à jour la couleur du slider du volume
function updateVolumeGradient(volume) {
  const min = volumeSlider.min || 0;
  const max = volumeSlider.max || 100;
  const percent = ((volume - min) / (max - min)) * 100;

  volumeSlider.style.background = `linear-gradient(to right, #1db954 ${percent}%, #555 ${percent}%)`;
  volumeSlider.value = volume;
  volumeSlider.title = volume + "%";
  checkVolumeButtonIcon(volume);
}

export function toggleReplayMode() {
  const replayModeButton = document.getElementById('replay-mode-button');
  app.replayMode = !app.replayMode;
  if (app.replayMode) {
    replayModeButton.classList.add("activated");
    replayModeButton.classList.remove("deactivated");

    if (audio.currentTime >= audio.duration) {
      audio.play();
    }
  }
  else {
    replayModeButton.classList.remove("activated");
    replayModeButton.classList.add("deactivated");
  }
}

function checkVolumeButtonIcon(volume) {
  volumeButton.classList = "";
  if (volume >= 40) { volumeButton.classList.add("volume-3"); }
  else if (volume >= 10) { volumeButton.classList.add("volume-2"); }
  else if (volume >= 1) { volumeButton.classList.add("volume-1"); }
  else {volumeButton.classList.add('volume-muted'); }
}







// Écouter un oiseau
export function listenToBird(birdName) {
  const variants = birdsData[birdName]?.variants || [];

  if (variants.length > 0) {
    currentBird = birdName;
    playBirdSound(birdName, Math.floor(Math.random() * variants.length));
  }
}

function toggleSoundControls(activate = true) {
  let buttons = [
    // document.getElementById('volume-button'),
    // document.getElementById('volume-slider'),
    document.getElementById('replay-button'),
    document.getElementById('rewind-button'),
    document.getElementById('pause-button'),
    document.getElementById('forward-button'),
    document.getElementById('switch-button')
  ];
  for (let button of buttons) {
    button.disabled = !activate;
    if (activate) {
      button.classList.remove("disabled");
    } else {
      button.classList.add("disabled");
    }
  }
}


export function playBirdSound(name, index = 0) {
  audio.pause();
  currentBird = name;
  const file = birdsData[name].variants[index];
  audio.src = file;

  audio.dataset.name = name;
  audio.dataset.index = index;
  audio.volume = app.volume/100;

  audio.play().then(() => {
    document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
  }).catch(err => {
    console.error("Erreur lecture :", err);
  });
  hidePopup();
}

export function playNextVariant() {
  const name = currentBird;
  const index = parseInt(audio.dataset.index || '0');
  const variants = birdsData[name]?.variants || [];
  if (variants.length < 2) return;
  const next = (index + 1) % variants.length;
  playBirdSound(name, next);
}

function validate(guess) {
  total++;
  
  const text = document.getElementById('result-text');
  if (guess === currentBird) {
    score++;
    text.innerHTML = `✔️ Bonne réponse !`;
    text.style.color = 'green';
    playSound('succes.mp3', 0.5 * app.volume/100);
  } else {
    text.innerHTML = `❌ Raté !`;
    text.style.color = 'red';
    playSound('erreur.mp3', 0.2 * app.volume/100);
  }
  document.getElementById('score').textContent = `Score: ${score}/${total}`;
  
  // Ajoute une écoute à l'oiseau
  // birdsData[currentBird].playCount += 1;
  // console.log(birdsData[currentBird]);

  // Afficher la popup
  document.getElementById('result-birdname-french').innerHTML = currentBird;
  let birdnameLatin = `(${getNomLatin(currentBird)})`;
  document.getElementById('result-birdname-latin').innerHTML = birdnameLatin;
  showImage(currentBird);
  showPopup();

}

function playSound(son, volume=1.0) {
  const chemin = `../ressources/sons/${son}`;
  const audio = new Audio(chemin);
  audio.volume = volume; // de 0.0 à 1.0
  audio.play();
}

function getNomLatin(nomFrancais) {
  return birdsData[nomFrancais]?.nom_latin || '';
}



export function togglePause() {
  if (audio.paused) {
    audio.play().then(() => {
      document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
      document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  } else {
    audio.pause();
    document.getElementById('pause-button-img').src = "../ressources/images/play-button.png";
    document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
}


function showImage(name) {
  const container = document.getElementById('result-image');
  const link = `https://www.oiseaux.net/oiseaux/${slugify(name)}.html`;
  const img = document.createElement('img');

  container.innerHTML = '';
  img.src = `../ressources/oiseaux/${name}/image.jpg`;
  img.style.maxWidth = '300px';
  img.style.cursor = 'pointer';
  img.onclick = () => {
    window.open(link, '_blank');
  };
  // img.title = link;
  img.title = "Cliquer pour en savoir plus sur cet oiseau"

  container.appendChild(img);
}


export function showPopup() {
  document.getElementById('overlay').style.zIndex = 10;
  const popup = document.getElementById('result-popup');
  popup.style.display = 'block';
  popup.style.animation = 'popupIn 0.3s forwards';
}

function hidePopup() {
  document.getElementById('overlay').style.zIndex = 0;
  const popup = document.getElementById('result-popup');
  popup.style.animation = 'popupOut 0.3s forwards';
  
  // après l'animation (300ms), on remet display: none
  setTimeout(() => {
    if (document.getElementById('overlay').style.zIndex == 0) {
      popup.style.display = 'none';
    }
  }, 300);
  clearSearch();
}


// Pour générer dynamiquement la grille des oiseaux
export async function genererGrilleOiseaux() {
  const grid = document.getElementById('bird-grid');
  grid.innerHTML = ''; // vide la grille avant de régénérer

  const selectedTypes = getSelectedTypes();
  birdList = [];

  for (const [name, info] of Object.entries(birdsData)) {
    if (!selectedTypes.includes(info.type)) continue;

    birdList.push(name);
    info.variants = await window.api.getMp3Paths(name);

    const divCell = document.createElement('div');
    divCell.className = `cell oiseau-${info.type}`;
    divCell.dataset.name = name;

    divCell.innerHTML = `
      <div class="columns is-vcentered">
        <div class="column is-one-fifth">
          <img class="bird-img" src="../ressources/oiseaux/${name}/image.jpg" alt="${name}">
        </div>
        <div class="column bird-name">
          <span class="bird-name-french">${name}</span>
          <span class="bird-name-latin">(${info.nom_latin})</span>
        </div>
      </div>
    `;

    divCell.addEventListener('click', () => validate(name));
    divCell.addEventListener('contextmenu', (e) => {
      e.preventDefault();

      const menu = document.getElementById('context-menu');
      const listenButton = document.getElementById('listen-bird-button');
      const seeButton = document.getElementById('see-bird-button');

      menu.style.display = 'block';
      menu.style.left = `${e.pageX}px`;
      menu.style.top = `${e.pageY}px`;

      // Quand on clique sur "Écouter"
      listenButton.onclick = () => {
        listenToBird(name);
        menu.style.display = 'none';
      };
      // Quand on clique sur "Plus d'infos"
      seeButton.onclick = () => {
        const link = `https://www.oiseaux.net/oiseaux/${slugify(name)}.html`;
        window.open(link, '_blank');
        menu.style.display = 'none';
      };
    });

    grid.appendChild(divCell);
  }
  document.getElementById('birdCount').innerHTML = birdList.length;
}




// Applique une sélection de types sur le programme
function applySelectedTypes(selectedTypes) {
    document.querySelectorAll('#type-selection .button').forEach(button => {
        const type = button.getAttribute('data-type');
        if (selectedTypes.includes(type)) {
            button.classList.add('is-selected');
        } else {
            button.classList.remove('is-selected');
        }
    });
}



// Choisi un oiseau aléatoire à écouter
export function playRandomBird() {
  // On choisi tous les oiseaux disponibles après le filtre, sauf le dernier écouté
  let pool = [];
  if (currentBird !== undefined) {
    pool = birdList.filter(b => b !== currentBird);
  } else {
    pool = birdList;
  }
  // Si aucun oiseau n'est disponible
  if (pool.length === 0) {
    audio.pause();
    audio.currentTime = 0;

    document.getElementById('titre').innerHTML = "Aucun oiseau n'est sélectionné !";

    // On désactive les commandes de son
    toggleSoundControls(false);
    document.getElementById('search-bar-control').style.display = 'none';
    birdAnimation.src = "../ressources/images/oiseau_qui_chante_pas.png";
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
  currentBird = pool[index];
  birdsData[currentBird].playCount = (birdsData[currentBird].playCount || 0) + 1;
  // console.log("Oiseau à trouver:", currentBird);
  // console.log('---------------------------------------');
  // for (index in birdsData) { if (birdsData[index].playCount > 0) console.log(index, ":", birdsData[index].playCount); }

  playBirdSound(currentBird, 0);
}



// Bind des raccourcis clavier
document.addEventListener('keydown', (e) => {
  // Si on est en train de taper dans un input ou textarea, on ignore le raccourci
  const activeElement = document.activeElement;
  if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
    return;
  }

  if (e.code === 'KeyM') {
    e.preventDefault();
    simulateClick(document.getElementById('volume-button'));
  }
  else if (e.code === 'KeyR') {
    e.preventDefault();
    simulateClick(document.getElementById('replay-button'));
  }
  else if (e.code === 'KeyP') {
    e.preventDefault();
    simulateClick(document.getElementById('switch-button'));
  }
  else if (e.code === 'Space') {
    e.preventDefault();
    if (document.getElementById('overlay').style.zIndex == 10) {
      simulateClick(document.getElementById('next-button'));
    } else {
      simulateClick(document.getElementById('pause-button'));
    }
  }
  else if (e.code === 'ArrowUp') {
    e.preventDefault();
    volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);;
    slideVolume();
  }
  else if (e.code === 'ArrowDown') {
    e.preventDefault();
    volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
    slideVolume();
  }
  else if (e.code === 'ArrowRight') {
    e.preventDefault();
    simulateClick(document.getElementById('forward-button'));
  }
  else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    simulateClick(document.getElementById('rewind-button'));
  }
});

volumeSlider.addEventListener('wheel', (e) => {
  if (e.deltaY > 0) {
    e.preventDefault();
    volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
    slideVolume();
  } else if (e.deltaY < 0) {
    e.preventDefault();
    volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);;
    slideVolume();
  }
});


function simulateClick(button) {
  button.classList.add('active');
  setTimeout(() => {
      button.classList.remove('active');
  }, 150); // durée de l'animation en ms
  button.click(); // optionnel si tu veux aussi déclencher l’action du bouton
}






const progressSlider = document.getElementById('progress-slider');


// Si l'utilisateur clique sur la barre → seek
progressSlider.addEventListener('input', () => {
    if (!audio || !audio.duration) return;

    const percent = progressSlider.value;
    audio.currentTime = (percent / 100) * audio.duration;
});

// Met à jour le slider pendant la lecture
function updateProgressSmooth() {
  if (audio && audio.duration) {
    const percent = (audio.currentTime / audio.duration) * 100;
    progressSlider.value = percent;
    progressSlider.style.background = `linear-gradient(to right, #1d47b9 ${percent}%, #555 ${percent}%)`;
  }

  requestAnimationFrame(updateProgressSmooth);
}

requestAnimationFrame(updateProgressSmooth);