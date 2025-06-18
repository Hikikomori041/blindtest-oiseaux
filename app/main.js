let birdsData = {};
let birdList = [];
let sounds = [];
let currentBird = null;
let score = 0;
let total = 0;

const audio = new Audio();

document.addEventListener('DOMContentLoaded', async () => {
  birdsData = await window.api.getBirdsData('./ressources/data/oiseaux.json');
  updateBirdList();

  document.getElementById('next').addEventListener('click', playRandomBird);
  document.getElementById('validate').addEventListener('click', validate);
  document.getElementById('pause').addEventListener('click', togglePause);
  document.getElementById('replay').addEventListener('click', () => audio.play());
  document.getElementById('rewind').addEventListener('click', () => {
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  });
  document.getElementById('forward').addEventListener('click', () => {
    audio.currentTime = Math.min(audio.duration, audio.currentTime + 5);
  });
  document.getElementById('switch').addEventListener('click', playNextVariant);

  // await window.api.getMp3Paths('Barge rousse').then(paths => {
  //   console.log(paths); // Liste des file://... à passer à tes balises <audio>
  // });
});



async function updateBirdList() {
  const list = document.getElementById('bird-list');
  list.innerHTML = '';
  birdList = [];

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
  }
}

function playRandomBird() {
  const pool = birdList.filter(b => b !== currentBird);
  if (pool.length === 0) return;
  currentBird = pool[Math.floor(Math.random() * pool.length)];
  playSound(currentBird, 0);
}

function playSound(name, index = 0) {
  console.log('name:', name);
  console.log('birdsData[name]:', birdsData[name]);
  console.log('birdsData[name].variants:', birdsData[name]?.variants);
  console.log('index:', index);


  const file = birdsData[name].variants[index];
  audio.src = file;
  console.log('Audio SRC:', audio.src);

  audio.play();
  audio.onerror = (err) => console.error('Erreur audio :', err);
  audio.onplay = () => console.log('Lecture audio OK');

  audio.dataset.name = name;
  audio.dataset.index = index;
  document.getElementById('result').textContent = '';
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
  const res = document.getElementById('result');
  if (guess === currentBird) {
    score++;
    res.textContent = `✔️ Bonne réponse ! (${guess})`;
    res.style.color = 'green';
  } else {
    res.textContent = `❌ Mauvais choix. C'était ${currentBird}`;
    res.style.color = 'red';
  }
  document.getElementById('score').textContent = `Score ${score}/${total}`;
  showImage(currentBird);
}

function togglePause() {
  if (audio.paused) audio.play();
  else audio.pause();
}

function showImage(name) {
  const container = document.getElementById('image-container');
  container.innerHTML = '';
  const img = document.createElement('img');
  img.src = `./ressources/oiseaux/${name}/image.jpg`;
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
