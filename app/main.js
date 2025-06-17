let birdsData = {};
let birdList = [];
let sounds = [];
let currentBird = null;
let score = 0;
let total = 0;

const audio = new Audio();

document.addEventListener('DOMContentLoaded', async () => {
  birdsData = await fetch('./ressources/data/oiseaux.json').then(r => r.json());
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
});

function updateBirdList() {
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

    const path = `./ressources/oiseaux/${name}`;
    info.variants = window.api.getMp3Files(`ressources/oiseaux/${name}`);
  }
}

function playRandomBird() {
  const pool = birdList.filter(b => b !== currentBird);
  if (pool.length === 0) return;
  currentBird = pool[Math.floor(Math.random() * pool.length)];
  playSound(currentBird, 0);
}

function playSound(name, index = 0) {
  const file = birdsData[name].variants[index];
  audio.src = file;
  audio.play();
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
