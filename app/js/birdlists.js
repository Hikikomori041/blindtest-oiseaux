import { playRandomBird } from "./player.js";
import { toggleSoundControls } from './controls.js';


export async function loadBirdlists() {
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
  let birdlistsElement = document.getElementById('birdlists-content');
  birdlistsElement.classList.add("fade-in");
  birdlistsElement.classList.remove('display-none');


  requestAnimationFrame(() => {
    birdlistsElement.classList.add("fade-in-active");
  });
  

  const birdLists = document.getElementById('my-lists');
  birdLists.innerHTML = "";

  // On ajoute la liste par défaut (tous les oiseaux)
  const defaultListElement = document.createElement('div');
  defaultListElement.id = "default-list";
  defaultListElement.className = "list-cell";
  defaultListElement.innerHTML = `
    <div>
      <p>Tous les oiseaux</p>
      <p id="current-list-p" class="visibility-hidden">Liste actuelle</p>
    </div>
    <div>
      <button id="load-list-1-button" class="button load-button tooltip tooltip-top" data-tooltip="Charger la liste">
        <img src="../ressources/images/load-button.svg" alt="Charger la liste"/>
      </button>
    </div>
  `;
  birdLists.appendChild(defaultListElement);
  // On ajoute les autres listes
  

  // On définit les actions des boutons des listes
  for (let birdList of birdLists.getElementsByClassName('list-cell')) {
    const editButton = birdList.getElementsByClassName('edit-button')[0];
    const loadButton = birdList.getElementsByClassName('load-button')[0];

    if (birdList.id == 'default-list') {
      birdList.addEventListener('click', () => {
        console.log(`On choisit la liste par défaut`);
      });
    } else {
      birdList.addEventListener('click', () => {
        console.log(`On choisit la liste ${birdList.id}`);
      });
    }
  }
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



export async function restorePreviousContent({app}) {
  const contentElement = document.getElementById('content');
  const controlsElement = document.getElementById('controls');
  const birdlistsElement = document.getElementById('birdlists-content');
  console.log(birdlistsElement);

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


  //todo: voir s'il faut lire un nouvel oiseau et reset le score (si on ne lit plus la même liste)
  resetBirds({app});

  //todo: check s'il faut cacher les types (dans le cas où on ne choisit pas la liste par défaut: les sélectionner tous et les cacher)



  
  // birdlistsElement.classList.remove("fade-out");

  await new Promise(resolve => setTimeout(resolve, 250));
  
  Array.from(contentElement.children).forEach(child => {
    if (child !== birdlistsElement) {
      child.classList.remove("fade-in", "fade-in-active");
    }
  });
  controlsElement.classList.remove("fade-in", "fade-in-active");
}

