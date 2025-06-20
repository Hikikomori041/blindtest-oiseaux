// Ici iront toutes les fonctions liées à l'affichage
import { getNomLatin, getSelectedTypes, slugify } from './strings.js';
import { bindBirdCell } from './controls.js';
import { clearSearch } from './search.js';
import { playSound } from './player.js';

// Applique une sélection de types sur le programme
export function applySelectedTypes(selectedTypes) {
  document.querySelectorAll('#type-selection .button').forEach(button => {
    const type = button.getAttribute('data-type');
    if (selectedTypes.includes(type)) {
      button.classList.add('is-selected');
    } else {
      button.classList.remove('is-selected');
    }
  });
}


function showImage(birdName) {
  const container = document.getElementById('result-image');
  const link = `https://www.oiseaux.net/oiseaux/${slugify(birdName)}.html`;
  const img = document.createElement('img');

  container.innerHTML = '';
  img.src = `../ressources/oiseaux/${birdName}/image.jpg`;
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

export function hidePopup() {
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
export async function genererGrilleOiseaux({app}) {
  const grid = document.getElementById('bird-grid');
  grid.innerHTML = ''; // vide la grille avant de régénérer

  const selectedTypes = getSelectedTypes();
  app.birdList = [];

  for (const [birdName, info] of Object.entries(app.birdsData)) {
    if (!selectedTypes.includes(info.type)) continue;

    app.birdList.push(birdName);
    info.variants = await window.api.getMp3Paths(birdName);

    const divCell = document.createElement('div');
    divCell.className = `cell oiseau-${info.type}`;
    divCell.dataset.name = birdName;

    divCell.innerHTML = `
      <div class="columns is-vcentered">
        <div class="column is-one-fifth">
          <img class="bird-img" src="../ressources/oiseaux/${birdName}/image.jpg" alt="${birdName}">
        </div>
        <div class="column bird-name">
          <span class="bird-name-french">${birdName}</span>
          <span class="bird-name-latin">(${info.nom_latin})</span>
        </div>
      </div>
    `;
    bindBirdCell(divCell, birdName, {app});
    
    grid.appendChild(divCell);
  }
  document.getElementById('birdCount').innerHTML = app.birdList.length;
}



// Met à jour le slider du son pendant la lecture
const progressSlider = document.getElementById('progress-slider');

export function startProgressSmooth(audio) {
  function step() {
      if (audio && audio.duration) {
          const percent = (audio.currentTime / audio.duration) * 100;
          progressSlider.value = percent;
          progressSlider.style.background = `linear-gradient(to right, #1d47b9 ${percent}%, #555 ${percent}%)`;
      }
      requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


export function validate(guess, {app}) {
  app.total++;
  
  const text = document.getElementById('result-text');
  if (guess === app.currentBird) {
    app.score++;
    text.innerHTML = `✔️ Bonne réponse !`;
    text.style.color = 'green';
    playSound('succes.mp3', 0.5 * app.volume/100);
  } else {
    text.innerHTML = `❌ Raté !`;
    text.style.color = 'red';
    playSound('erreur.mp3', 0.2 * app.volume/100);
  }
  document.getElementById('score').textContent = `Score: ${app.score}/${app.total}`;
  
  // Ajoute une écoute à l'oiseau
  // app.birdsData[currentBird].playCount += 1;
  // console.log(app.birdsData[currentBird]);

  // Afficher la popup
  document.getElementById('result-birdname-french').innerHTML = app.currentBird;
  document.getElementById('result-birdname-latin').innerHTML = `(${getNomLatin(app.currentBird, app.birdsData)})`;
  showImage(app.currentBird);
  showPopup();
}