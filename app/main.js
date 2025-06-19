let birdsData = {};
let birdList = [];
let sounds = [];
let currentBird = null;
let score = 0;
let total = 0;

let replayMode = true;

const audio = new Audio();

let isMaximized = false;

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('close-button').addEventListener('click', () => window.api.close());
  document.getElementById('minimize-button').addEventListener('click', () => window.api.minimize());

  const maximizeButton = document.getElementById('maximize-button');
  maximizeButton.addEventListener('click', () => {
    window.api.maximize();
  });
  maximizeButton.click();

  window.api.onWindowMaximize(() => {
    maximizeButton.innerHTML = '🗗';
  });

  window.api.onWindowUnmaximize(() => {
    maximizeButton.innerHTML = '🗖';
  });

  document.getElementById('close-popup-button').addEventListener('click', () => hidePopup());



  birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  // for (index in birdsData) { birdsData[index].playCount = 0; } // instancie un nombre d'écoute à chaque oiseau

  await genererGrilleOiseaux();

  // Clic ailleurs → on ferme le menu
  document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
  });
  updateVolumeGradient();
  playRandomBird();
})

// Barre de recherche
document.getElementById('search-bar').addEventListener('input', (e) => {
  const query = e.target.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    const name = cell.dataset.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (name.includes(query)) {
      cell.style.display = '';
    } else {
      cell.style.display = 'none';
    }
  });
});

// Effacer la recheche
function clearSearch() {
  document.getElementById('search-bar').value = '';
  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    cell.style.display = '';
  });
}
document.getElementById('clear-search').addEventListener('click', () => { clearSearch(); });



audio.addEventListener('ended', () => {
  if (replayMode) {
    togglePause();
  } else {
    pauseButtonImg.src = "../ressources/images/play-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
});

const volumeButton = document.getElementById('volume-button');
const volumeSlider = document.getElementById('volume-slider');
let muted = false;
let volume = 100;
let lastVolume = 100;

function muteAudio() {
  if (!muted) {
    lastVolume = volume;
    volume = 0;
  } else {
    volume = lastVolume;
    if (volume == 0) volume = 10;
  }
  volumeSlider.value = volume;
  muted = !muted;
  changeAudio();
}

function slideVolume () {
  volume = volumeSlider.value;
  if (volume == 0) muteAudio();
  else muted = false;
  changeAudio();
}

// Met à jour la couleur du slider du volume
function updateVolumeGradient() {
  const min = volumeSlider.min || 0;
  const max = volumeSlider.max || 100;
  const percent = ((volume - min) / (max - min)) * 100;

  volumeSlider.style.background = `linear-gradient(to right, #1db954 ${percent}%, #555 ${percent}%)`;
}

function checkVolumeButtonIcon() {
  volumeButton.classList = "";
  if (volume >= 40) { volumeButton.classList.add("volume-3"); }
  else if (volume >= 10) { volumeButton.classList.add("volume-2"); }
  else if (volume >= 1) { volumeButton.classList.add("volume-1"); }
  else {volumeButton.classList.add('volume-muted'); }
}

function changeAudio() {
  audio.volume = volume/100;
  checkVolumeButtonIcon();
  updateVolumeGradient();
}

// Ajoute les commandes aux boutons de lecture audio
volumeButton.addEventListener('click', muteAudio);
volumeSlider.addEventListener('input', slideVolume);

document.getElementById('next-button').addEventListener('click', playRandomBird);
document.getElementById('pause-button').addEventListener('click', togglePause);

const pauseButtonImg = document.getElementById('pause-button-img');

document.getElementById('replay-button').addEventListener('click', () => {
  audio.currentTime = 0;
  audio.play().then(() => {
    pauseButtonImg.src = "../ressources/images/pause-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante.gif";
  }).catch(err => {
    console.error("Erreur lecture :", err);
  });
});
document.getElementById('rewind-button').addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 5); });
document.getElementById('forward-button').addEventListener('click', () => { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); });
document.getElementById('switch-button').addEventListener('click', playNextVariant);

const birdAnimation = document.getElementById('bird-animation');

// Écouter un oiseau
function listenToBird(birdName) {
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
  for (button of buttons) {
    button.disabled = !activate;
    if (activate) {
      button.classList.remove("disabled");
    } else {
      button.classList.add("disabled");
    }
  }
}


function playBirdSound(name, index = 0) {
  audio.pause();
  currentBird = name;
  const file = birdsData[name].variants[index];
  audio.src = file;

  audio.dataset.name = name;
  audio.dataset.index = index;
  audio.volume = volume/100;

  audio.play().then(() => {
    pauseButtonImg.src = "../ressources/images/pause-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante.gif";
  }).catch(err => {
    console.error("Erreur lecture :", err);
  });
  hidePopup();
}

function playNextVariant() {
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
    playSound('succes.mp3', 0.5 * volume/100);
  } else {
    text.innerHTML = `❌ Raté !`;
    text.style.color = 'red';
    playSound('erreur.mp3', 0.2 * volume/100);
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



function togglePause() {
  if (audio.paused) {
    audio.play().then(() => {
    pauseButtonImg.src = "../ressources/images/pause-button.png";
      birdAnimation.src = "../ressources/images/oiseau_qui_chante.gif";
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  } else {
    audio.pause();
    pauseButtonImg.src = "../ressources/images/play-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante_pas.png";
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

function slugify(nom) {
  return nom.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ /g, '.')
    .replace(/[^a-z0-9.-]/g, '');
}


function showPopup() {
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

let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Ce qui doit se passer après le resize (genre redessiner un fond)
  }, 150);
});


// Pour générer dynamiquement la grille des oiseaux
async function genererGrilleOiseaux() {
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


// Met à jour la liste des oiseaux après un click sur une checkbox
document.querySelectorAll('#type-selection .button').forEach(btn => {
  btn.addEventListener('click', async () => {
    btn.classList.toggle('is-selected');
    await genererGrilleOiseaux();
    playRandomBird();
  });
});

// Retourne les types d'oiseaux sélectionnés
function getSelectedTypes() {
  return [...document.querySelectorAll('#type-selection .button.is-selected')]
    .map(btn => btn.dataset.type);
}


// Choisi un oiseau aléatoire à écouter
function playRandomBird() {
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
  else if (e.code === 'ArrowRight') {
    e.preventDefault();
    simulateClick(document.getElementById('forward-button'));
  }
  else if (e.code === 'ArrowLeft') {
    e.preventDefault();
    simulateClick(document.getElementById('rewind-button'));
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
