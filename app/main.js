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
  await genererGrilleOiseaux();

  // Clic ailleurs → on ferme le menu
  document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
  });
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
  console.log('Le son est fini !');

  if (replayMode) {
    togglePause();
  } else {
    pauseButtonImg.src = "../ressources/images/play-button.png";
    birdAnimation.src = "../ressources/images/oiseau_qui_chante_pas.png";
  }
});



// Ajoute les commandes aux boutons de lecture audio
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

  // .disabled = activate;
}


function playRandomBird() {
  let pool = [];
  if (currentBird !== undefined) {
    pool = birdList.filter(b => b !== currentBird);
  } else {
    pool = birdList;
  }
  // console.log("pool length", pool.length);
  if (pool.length === 0) {
    audio.pause();
    audio.currentTime = 0;

    document.getElementById('titre').innerHTML = "Aucun oiseau n'est sélectionné !";
    // console.error("Aucun type d'oiseau sélectionné !");
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
  
  currentBird = pool[Math.floor(Math.random() * pool.length)];
  console.log("oiseau:", currentBird);
  playBirdSound(currentBird, 0);
}

function playBirdSound(name, index = 0) {
  audio.pause();
  currentBird = name;
  const file = birdsData[name].variants[index];
  audio.src = file;

  audio.dataset.name = name;
  audio.dataset.index = index;

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
  document.getElementById('score').textContent = `Score: ${score}/${total}`;
  
  const text = document.getElementById('result-text');
  if (guess === currentBird) {
    score++;
    text.innerHTML = `✔️ Bonne réponse !`;
    text.style.color = 'green';
    playSound('succes.mp3', 0.5);
  } else {
    text.innerHTML = `❌ Raté !`;
    text.style.color = 'red';
    playSound('erreur.mp3', 0.2);
  }
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

function getSelectedTypes() {
  return [...document.querySelectorAll('#type-selection .button.is-selected')]
    .map(btn => btn.dataset.type);
}




// Bind des raccourcis clavier
document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyR') {
    e.preventDefault();
    document.getElementById('replay-button').click();
    // document.getElementById('replay-button').style.background = 'red';//todo: faire flash une couleur pour montrer qu'on appuie sur le bouton
  }
  if (e.code === 'Space') {
    e.preventDefault();
    if (document.getElementById('overlay').style.zIndex == 10) {
      document.getElementById('next-button').click();
    } else {
      document.getElementById('pause-button').click();
    }
  }
  if (e.code === 'ArrowRight') {
    document.getElementById('forward-button').click();
  }
  if (e.code === 'ArrowLeft') {
    document.getElementById('rewind-button').click();
  }
  if (e.code === 'KeyP') {
    document.getElementById('switch-button').click();
  }
});
