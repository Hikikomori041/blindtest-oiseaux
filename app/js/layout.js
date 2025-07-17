// Ici iront toutes les fonctions liées à l'affichage
import { getNomLatin, getSelectedTypes, slugify } from './strings.js';
import { bindBirdCell } from './controls.js';
import { clearSearch } from './search.js';
import { playSound } from './player.js';

// Change la version dans le titre
export const setTitleVersion = async () => {
  const version = await window.api.getVersion();
  document.querySelector('#titlebar .title').textContent = `Blind-Test Oiseaux v${version}`;
  document.title = `Blind-Test Oiseaux v${version}`;
};

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
    console.log(link);
    window.open(link, '_blank');
  };
  // img.title = link;
  // img.title = "Cliquer pour en savoir plus sur cet oiseau";

  container.appendChild(img);
}

export function openPopup() {
  showOverlay();
  const popup = document.getElementById('result-popup');
  popup.classList.add("active");
  popup.style.display = 'block';
  popup.style.animation = 'popupIn 0.3s forwards';
}

export function closePopup() {
  hideOverlay();
  const popup = document.getElementById('result-popup');
  popup.classList.remove("active");
  popup.style.animation = 'popupOut 0.3s forwards';
  
  // après l'animation (300ms), on remet display: none
  setTimeout(() => {
    if (document.getElementById('overlay').style.zIndex == 0) {
      popup.style.display = 'none';
    }
  }, 300);
  clearSearch();
}

export function showShortcutsPopup() {
  showOverlay();
  const popup = document.getElementById('shortcuts-popup');
  popup.classList.add("active");
  popup.style.display = 'block';
  popup.style.animation = 'popupIn 0.3s forwards';
}
export function hideShortcutsPopup() {
  if (!document.getElementById('result-popup').classList.contains('active')) {
    hideOverlay();
  }
  const popup = document.getElementById('shortcuts-popup');
  popup.classList.remove("active");
  popup.style.animation = 'popupOut 0.3s forwards';
  
  // après l'animation (300ms), on remet display: none
  setTimeout(() => {
    if (document.getElementById('overlay').style.zIndex == 0) {
      popup.style.display = 'none';
    }
  }, 300);
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
    divCell.className = `cell oiseau-${info.type}-opaque`;
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
  let birdCountText = app.birdList.length;
  if (app.birdList.length == 0) {
    document.getElementById('bird-animation').classList.add("hidden");
  } else {
    document.getElementById('bird-animation').classList.remove("hidden");
  }
  if (app.birdList.length <= 1) {
    birdCountText += " oiseau sélectionné";
  } else {
    birdCountText += " oiseaux sélectionnés";
  }
  document.getElementById('birdCount').innerHTML = birdCountText;
}



// Met à jour le slider du son pendant la lecture
const audioSlider = document.getElementById('audio-slider');

export function startProgressSmooth(audio) {
  function step() {
    if (!audio || !audio.duration || audio.src == "") {
    // Pour reset le slider à 0 quand on stop un son
      if (audio.paused) {
        audioSlider.value = 0;
        audioSlider.style.background = `linear-gradient(to right, #1d47b9 0%, #555 0%)`;
      }
    } else if (audio && audio.duration) {
    // Met à jour le slider selon la lecture du son
      const percent = (audio.currentTime / audio.duration) * 100;
      audioSlider.value = percent;
      audioSlider.style.background = `linear-gradient(to right, #1d47b9 ${percent}%, #555 ${percent}%)`;
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


export function validate(guess, {app}) {
  app.total++;
  
  const popup = document.getElementById('result-popup');
  const text  = document.getElementById('result-text');
  if (guess === app.currentBird) {
    // Bonne réponse
    app.score++;

    // popup.classList.remove('wrong');
    // popup.classList.add('right');

    text.innerHTML = `✔️ Bonne réponse !`;
    text.style.color = 'rgb(24, 196, 24)';

    playSound({app}, 'succes.mp3', 0.5 * app.volume/100);
  } else {
    // Mauvaise réponse
    // popup.classList.remove('right');
    // popup.classList.add('wrong');

    text.innerHTML = `❌ Mauvaise réponse !`;
    text.style.color = 'red';

    playSound({app}, 'erreur.mp3', 0.2 * app.volume/100);
  }
  document.getElementById('score').textContent = `Oiseaux trouvés: ${app.score}/${app.total}`;
  
  // Ajoute une écoute à l'oiseau
  app.birdsData[app.currentBird].playCount = (app.birdsData[app.currentBird].playCount || 0) + 1;

  // Afficher la popup
  [...popup.classList].filter(c => c.startsWith('oiseau-')).forEach(c => popup.classList.remove(c));
  popup.classList.add(`oiseau-` + app.birdsData[app.currentBird].type + '-opaque');
  document.getElementById('result-birdname-french').innerHTML = app.currentBird;
  document.getElementById('result-birdname-latin').innerHTML = `(${getNomLatin(app.currentBird, app.birdsData)})`;
  showImage(app.currentBird);
  openPopup();
}



export function showOverlay(zIndex = 10) {
  const overlay = document.getElementById('overlay');
  overlay.style.zIndex = zIndex;
  overlay.style.opacity = 1;
  if (zIndex == 100) {
    overlay.style.background = "rgba(0, 0, 0, 0.75)";
  }
}

export function hideOverlay() {
  const overlay = document.getElementById('overlay');
  overlay.style.background = "rgba(100, 100, 100, 0.35)";
  if (document.getElementById('more-menu').classList.contains('visible') && document.getElementById('result-popup').style.display == "block") {
    overlay.style.zIndex = 10;
  } else {
    overlay.style.zIndex = 0;
    overlay.style.opacity = 0;
  }
}

export function updateTiles({app}) {
  let confirmSoundMutedTile = document.getElementById('toggle-confirm-sound-tile');
  let autoplayTile = document.getElementById('toggle-autoplay-tile');

  if (app.confirmSoundMuted) {
    confirmSoundMutedTile.classList.add("activated");
    confirmSoundMutedTile.setAttribute("data-tooltip", "Activer les sons de validation");
    confirmSoundMutedTile.innerHTML = `
      <img src="../ressources/images/volume-muted-yellow.png"/>
      <span>Sons de validation désactivés</span>
    `;
  } else {
    confirmSoundMutedTile.setAttribute("data-tooltip", "Désactiver les sons de validation");
    confirmSoundMutedTile.classList.remove("activated");
    confirmSoundMutedTile.innerHTML = `
      <img src="../ressources/images/volume-3-yellow.png"/>
      <span>Sons de validation activés</span>
    `;
  }


  if (app.autoplayAtStart) {
    autoplayTile.classList.add("activated");
    autoplayTile.setAttribute("data-tooltip", "Désactiver la lecture au démarrage de l'application");
    autoplayTile.innerHTML = `
      <img src="../ressources/images/autoplay-on.png"/>
      <span>Lecture au démarrage activée</span>
    `;
  } else {
    autoplayTile.classList.remove("activated");
    autoplayTile.setAttribute("data-tooltip", "Activer la lecture au démarrage de l'application");
    autoplayTile.innerHTML = `
      <img src="../ressources/images/autoplay-off.png"/>
      <span>Lecture au démarrage désactivée</span>
    `;
  }
}