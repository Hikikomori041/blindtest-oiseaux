let birdsData = {};
let birdList = [];
let sounds = [];
let currentBird = null;
let score = 0;
let total = 0;

const audio = new Audio();

document.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('maximize').click();

  birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  await genererGrilleOiseaux();

  // Clic ailleurs → on ferme le menu
  document.addEventListener('click', () => {
    document.getElementById('context-menu').style.display = 'none';
  });
  playRandomBird();
})



// Ajoute les commandes aux boutons de lecture audio
document.getElementById('result-next').addEventListener('click', playRandomBird);
const pauseButton = document.getElementById('pause-button');
pauseButton.addEventListener('click', togglePause);
document.getElementById('replay').addEventListener('click', () => {
  audio.currentTime = 0;
  audio.play().then(() => {
    pauseButton.innerHTML = "⏸️";
  }).catch(err => {
    console.error("Erreur lecture :", err);
  });
});
document.getElementById('rewind').addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 5);
});
document.getElementById('forward').addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
});
document.getElementById('switch').addEventListener('click', playNextVariant);


// Écouter un oiseau
function listenToBird(birdName) {
  const variants = birdsData[birdName]?.variants || [];

  if (variants.length > 0) {
    currentBird = birdName;
    playBirdSound(birdName, Math.floor(Math.random() * variants.length));
  }
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
    return;
  } else {
    document.getElementById('titre').innerHTML = "Quel est cet oiseau ?";
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
    pauseButton.innerHTML = "⏸️";
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
      pauseButton.innerHTML = "⏸️";
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  } else {
    audio.pause();
    pauseButton.innerHTML = "▶️";
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
  const popup = document.getElementById('result-popup');
  popup.style.display = 'block';
  popup.style.animation = 'popupIn 0.3s forwards';
}

function hidePopup() {
  const popup = document.getElementById('result-popup');
  popup.style.animation = 'popupOut 0.3s forwards';
  
  // après l'animation (300ms), on remet display: none
  setTimeout(() => {
    popup.style.display = 'none';
  }, 300);
}


document.getElementById('minimize').addEventListener('click', () => window.api.minimize());
document.getElementById('maximize').addEventListener('click', () => window.api.maximize());
document.getElementById('close').addEventListener('click', () => window.api.close());


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

  const selectedTypes = [...document.querySelectorAll('#type-selection input:checked')].map(cb => cb.value);
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
}


// Met à jour la liste des oiseaux après un click sur une checkbox
document.querySelectorAll('#type-selection input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', async () => {
    await genererGrilleOiseaux();
    playRandomBird();
  });
});
