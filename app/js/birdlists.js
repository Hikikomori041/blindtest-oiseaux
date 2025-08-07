import { playRandomBird } from "./player.js";
import { toggleSoundControls } from './controls.js';
import { applySelectedList } from "./layout.js";


export async function loadBirdlistsPage({app}) {
  animateBirdlistsFadeIn();
  loadBirdlists({app});
}


async function loadBirdlists({app}) {
  const birdLists = document.getElementById('my-lists');
  birdLists.innerHTML = "";

  // On ajoute la liste par défaut (tous les oiseaux)
  const defaultListElement = document.createElement('div');
  defaultListElement.className = "list-cell";
  defaultListElement.id = "default-list";
  defaultListElement.innerHTML = `
    <div class="list-title">
      <p id="${defaultListElement.id}-name">Tous les oiseaux</p>
      <p class="current-list-p${defaultListElement.id !== app.loadedList ? ' visibility-hidden' : ''}">Liste actuelle</p>
    </div>
    <div>
      <button id="load-list-1-button" class="button load-button tooltip tooltip-bottom" data-tooltip="Charger cette liste">
        <img src="../ressources/images/load-button.svg" alt="Charger"/>
      </button>
    </div>
  `;
  birdLists.appendChild(defaultListElement);

  // On ajoute les autres listes
  for(let i=1; i<=7; i++) {

    let listElmt = document.createElement('div');
    listElmt.className = "list-cell";
    listElmt.id = `list-${i}`;

    const listName = await window.api.getListName(listElmt.id);
    listElmt.innerHTML = `
      <div class="list-title">
        <p id="${listElmt.id}-name">${listName}</p>
        <p class="current-list-p${listElmt.id !== app.loadedList ? ' visibility-hidden' : ''}">Liste actuelle</p>
      </div>
      <div>
        <button id="edit-list-${i}-button" class="button edit-button tooltip tooltip-bottom" data-tooltip="Modifier cette liste">
          <img src="../ressources/images/edit-button.svg" alt="Modifier"/>
        </button>
        <button id="load-list-${i}-button" class="button load-button tooltip tooltip-bottom" data-tooltip="Charger cette liste">
          <img src="../ressources/images/load-button.svg" alt="Charger"/>
        </button>
      </div>
    `;
    birdLists.appendChild(listElmt);
  }
  

  // On définit les actions des boutons des listes
  for (let birdList of birdLists.getElementsByClassName('list-cell')) {
    const editButton = birdList.getElementsByClassName('edit-button')[0];
    const loadButton = birdList.getElementsByClassName('load-button')[0];

    if (birdList.id == 'default-list') {
      loadButton.addEventListener('click', () => {
        console.log(`On charge la liste par défaut`);
        loadList({app}, birdList.id);
      });
    } else {
      editButton.addEventListener('click', () => {
        console.log(`On modifie la liste "${birdList.id}"`);
      });
      loadButton.addEventListener('click', () => {
        console.log(`On charge la liste "${birdList.id}"`);
        loadList({app}, birdList.id);
      });
    }
  }
}

function loadList({app}, listId) {
  if (app.loadedList != listId) {
    // Si on charge une autre liste que la liste actuelle
    app.loadedList = listId;

    applySelectedList({app});
    
    // const listName = document.getElementById(`${listId}-name`).innerHTML;
    // app.loadedList = listId;
    // document.getElementById('loaded-list-name').innerHTML = listName;
  }

  restoreBlindtestPage({app});
}

async function animateBirdlistsFadeIn() {
const contentElement = document.getElementById('content');
  const controlsElement = document.getElementById('controls');

  // 1. Ajoute fade-out aux anciens éléments
  Array.from(contentElement.children).forEach(child => {
    child.classList.add("fade-out");
  });
  // contentElement.classList.add("fade-out");
  controlsElement.classList.add("fade-out");

  // 2. Attend la fin de la transition
  await new Promise(resolve => setTimeout(resolve, 125));

  // 3. Cache les anciens éléments après la transition
  Array.from(contentElement.children).forEach(child => {
    child.classList.add("display-none");
    child.classList.remove("fade-out");
  });
  controlsElement.classList.add("display-none");
  controlsElement.classList.remove("fade-out");


  // 4. Crée et insère le nouveau contenu si pas déjà fait
  let birdlistsElement = document.getElementById('birdlists-page');
  birdlistsElement.classList.add("fade-in");
  birdlistsElement.classList.remove('display-none');


  requestAnimationFrame(() => {
    birdlistsElement.classList.add("fade-in-active");
  });
  
}

async function animateBirdlistsFadeOut() {
  const contentElement = document.getElementById('content');
  const controlsElement = document.getElementById('controls');
  const birdlistsElement = document.getElementById('birdlists-page');

  // Cache l'écran des listes
  // 1. Lance le fade-out de birdlists
  birdlistsElement.classList.remove("fade-in", "fade-in-active");
  birdlistsElement.classList.add("fade-out");

  setTimeout(() => {
    // 2. Cache birdlists proprement
    birdlistsElement.classList.add("display-none");
    birdlistsElement.classList.remove("fade-out");

    // 3. Réaffiche les autres
    Array.from(contentElement.children).forEach(child => {
      if (child !== birdlistsElement) {
        child.classList.remove("display-none");
        child.classList.add("fade-in");
        requestAnimationFrame(() => {
          child.classList.add("fade-in-active");
        });
      }
    });
    controlsElement.classList.remove("display-none");
    controlsElement.classList.add("fade-in");
    requestAnimationFrame(() => {
      controlsElement.classList.add("fade-in-active");
    });
  }, 125); // match la durée de .fade-out
  

  // Pour supprimer les classes inutiles après et éviter les bugs
  await new Promise(resolve => setTimeout(resolve, 250));
  
  Array.from(contentElement.children).forEach(child => {
    if (child !== birdlistsElement) {
      child.classList.remove("fade-in", "fade-in-active");
    }
  });
  controlsElement.classList.remove("fade-in", "fade-in-active");
}

async function resetBirds({app}) {
  app.score = 0;
  app.total = 0;
  document.getElementById('score').textContent = `Oiseaux trouvés: -/-`;
  toggleSoundControls(true);

  // if (app.autoplayAtStart) {
  //   playRandomBird({app});
  // }
  app.birdHasBeenPlayed = true;
  playRandomBird({app});
  // loadApp();
}


export async function restoreBlindtestPage({app}) {
  animateBirdlistsFadeOut();

  //todo: voir s'il faut lire un nouvel oiseau et reset le score (si on ne lit plus la même liste)
  // genre if loadedList est deja egal a la liste selectionnee
  resetBirds({app});

  //todo: check s'il faut cacher les types (dans le cas où on ne choisit pas la liste par défaut: les sélectionner tous et les cacher)

}

