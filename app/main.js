let birdsData = {};
let birdList = [];
let sounds = [];
let currentBird = null;
let score = 0;
let total = 0;

const audio = new Audio();

document.addEventListener('DOMContentLoaded', async () => {
  birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  await updateBirdList();
});


// Ajoute les commandes aux boutons de lecture audio
document.getElementById('result-next').addEventListener('click', playRandomBird);
// document.getElementById('next').addEventListener('click', playRandomBird);
document.getElementById('validate').addEventListener('click', validate);

document.getElementById('pause-button').addEventListener('click', togglePause);
document.getElementById('replay').addEventListener('click', () => {
  audio.currentTime = 0;
  audio.play()
});
document.getElementById('rewind').addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - 5);
});
document.getElementById('forward').addEventListener('click', () => {
  audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
});
document.getElementById('switch').addEventListener('click', playNextVariant);


// Met à jour la liste des oiseaux
async function updateBirdList() {
  const list = document.getElementById('bird-list');
  list.innerHTML = '';
  birdList = [];

  // Récupère les types sélectionnés (commun, eau, plaine)
  const selectedTypes = [...document.querySelectorAll('#type-selection input:checked')].map(cb => cb.value);
  for (const [name, info] of Object.entries(birdsData)) {
    if (!selectedTypes.includes(info.type)) continue;

    const li = document.createElement('li');
    li.textContent = `${name} (${info.nom_latin})`;
    li.dataset.name = name;
    li.addEventListener('click', () => {
      [...list.children].forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
    });
    list.appendChild(li);
    birdList.push(name);

    info.variants = await window.api.getMp3Paths(name);

    // console.log(info);
    const firstLi = list.querySelector('li');
    if (firstLi) {
      firstLi.click();
    }
  }
  playRandomBird();
}

// Met à jour la liste des oiseaux après un click sur une checkbox
document.querySelectorAll('#type-selection input[type=checkbox]').forEach(cb => {
  cb.addEventListener('change', updateBirdList);
});


function playRandomBird() {
  let pool = []
  if (currentBird !== undefined) {
    pool = birdList.filter(b => b !== currentBird);
  } else {
    pool = birdList;
  }
  // console.log("pool", pool);
  
  if (pool.length === 0) return;
  currentBird = pool[Math.floor(Math.random() * pool.length)];
  console.log("oiseau:", currentBird);
  playSound(currentBird, 0);
}

function playSound(name, index = 0) {
  const file = birdsData[name].variants[index];
  audio.src = file;
  audio.play();

  audio.dataset.name = name;
  audio.dataset.index = index;
  hidePopup();
}

function playNextVariant() {
  const name = currentBird;
  const index = parseInt(audio.dataset.index || '0');
  const variants = birdsData[name]?.variants || [];
  if (variants.length < 2) return;
  const next = (index + 1) % variants.length;
  playSound(name, next);
}

function validate() {
  const selected = document.querySelector('#bird-list .selected');
  if (!selected) return;
  const guess = selected.dataset.name;
  total++;
  // document.getElementById('score').textContent = `Score ${score}/${total}`;
  
  const text  = document.getElementById('result-text');
  if (guess === currentBird) {
    score++;
    text.innerHTML = `✔️ Bonne réponse !`;
    text.style.color = 'green';
    lireSon('succes.mp3');
  } else {
    text.innerHTML = `❌ Raté !`;
    text.style.color = 'red';
    lireSon('erreur.mp3');
  }
  // Afficher la popup
  document.getElementById('result-birdname-french').innerHTML = currentBird;
  let birdnameLatin = `(${getNomLatin(currentBird)})`;
  document.getElementById('result-birdname-latin').innerHTML = birdnameLatin;
  showImage(currentBird);
  
  showPopup();
}

function lireSon(nomDuSon) {
  // const chemin = `file://${__dirname}/ressources/sons/${nomDuSon}`;
  const chemin = `../ressources/sons/${nomDuSon}`;
  const audio = new Audio(chemin);
  audio.play();
}

function getNomLatin(nomFrancais) {
  return birdsData[nomFrancais]?.nom_latin || '';
}



function togglePause() {
  let pauseButton = document.getElementById('pause-button');

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
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = `../ressources/oiseaux/${name}/image.jpg`;
  img.style.maxWidth = '300px';
  img.style.cursor = 'pointer';
  img.onclick = () => {
    const link = `https://www.oiseaux.net/oiseaux/${slugify(name)}.html`;
    window.open(link, '_blank');
  };
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
