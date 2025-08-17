import { playRandomBird, togglePause } from "./player.js";
import { toggleSoundControls, simulateClick } from './controls.js';
import { applySelectedList, genererGrilleOiseaux } from "./layout.js";
import { clearSearch } from "./search.js";


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
  if (defaultListElement.id === app.loadedList) defaultListElement.classList.add("selected-list");
  defaultListElement.innerHTML = `
    <div class="list-title">
      <p id="default-list-name">Tous les oiseaux</p>
      <p class="current-list-p${defaultListElement.id !== app.loadedList ? ' visibility-hidden' : ''}">Liste actuelle</p>
    </div>
    <div>
      <button id="load-default-list-button" class="button load-button tooltip tooltip-bottom" data-tooltip="Charger cette liste">
        <img src="../ressources/images/load-button.svg" alt="Charger"/>
      </button>
    </div>
  `;
  birdLists.appendChild(defaultListElement);

  // On ajoute les autres listes
  app.myLists = await window.api.getAllLists();
  console.log(app.myLists);

  for(let idx in app.myLists) {
    let list = app.myLists[idx];
    let listElmt = document.createElement('div');
    listElmt.className = "list-cell";
    listElmt.id = `list-${idx}`;
    if (listElmt.id === app.loadedList) listElmt.classList.add("selected-list");

    listElmt.innerHTML = `
      <div class="list-title">
        <p id="${listElmt.id}-name">${list.name}</p>
        <p class="current-list-p${listElmt.id !== app.loadedList ? ' visibility-hidden' : ''}">Liste actuelle</p>
      </div>
      <div>
        <button id="edit-${listElmt.id}-button" class="button edit-button tooltip tooltip-bottom" data-tooltip="Modifier cette liste">
          <img src="../ressources/images/edit-button.svg" alt="Modifier"/>
        </button>
        <button id="load-${listElmt.id}-button" class="button load-button tooltip tooltip-bottom" data-tooltip="Charger cette liste">
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
        loadList({app}, birdList.id);
      });
    } else {
      editButton.addEventListener('click', () => {
        openListEditPage({app}, birdList.id);
      });
      loadButton.addEventListener('click', () => {
        loadList({app}, birdList.id);
      });
    }
  }

}

export async function deleteList({app}) {
  const listId = document.getElementById("list-name-textarea").dataset.id;

  // On supprime le fichier ${listId}.json`
  if (listId == app.loadedList) {
    app.loadedList = "default-list";
  }

  // Enregistre les modifications de la liste
  window.api.deleteList(listId);
}

export async function saveList() {
  const listName = document.getElementById("list-name-textarea").value;
  const listId = document.getElementById("list-name-textarea").dataset.id;
  let birdsList = [];

  const birdsCells = document.getElementById("list-bird-grid");

  for (let cell of birdsCells.getElementsByClassName("cell")) {
    if (!cell.classList.contains("oiseau-unselected")) {
      birdsList.push(cell.dataset.name);
    }
  }

  const newList = {
    "name": listName,
    "birds": birdsList
  }

  // Enregistre les modifications de la liste
  window.api.saveList(listId, newList);
}

export async function openListEditPage({app}, listId) {
  const id = listId.replace(/^list-/, '');
  const list = app.myLists[id];

  // On cache la page des listes
  const birdListsPage = document.getElementById("birdlists-page");
  birdListsPage.classList.add("display-none");

  // On affiche la page d'édition de la liste
  const listEditPage = document.getElementById("list-edit-page");
  listEditPage.classList.remove("display-none");

  // On charge le nom de la liste
  const listNameElmt = document.getElementById("list-name-textarea");
  listNameElmt.value = list.name;
  listNameElmt.dataset.id = listId;

  listNameElmt.focus();
  listNameElmt.addEventListener('keydown', (e) => {
    if (e.key === "Enter") {
      saveList();
      restoreMyListsPage({ app });
    }
  });
 
  // On charge la grille d'oiseaux
  showBirdList({app}, list);
}


// Pour générer dynamiquement la grille des oiseaux
async function showBirdList({app}, list) {
  //todo: génerer d'abord la liste, et ne faire qu'un showBirdList qui edite les classes des cells et le compteur
  const grid = document.getElementById("list-bird-grid");
  grid.innerHTML = ""; // vide la grille avant de régénérer
  
  if (app.birdsSize == "small") {
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
  } else if (app.birdsSize == "default") {
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
  } else { //big
    grid.style.gridTemplateColumns = "repeat(auto-fill, minmax(360px, 1fr))";
  }


  for (const [birdName, info] of Object.entries(app.birdsData)) {
    const divCell = document.createElement('div');
    divCell.classList.add("cell", `oiseau-${info.type}-opaque`, app.birdsSize);
    // Si l'oiseau n'est pas sélectionné
    if (!list.birds.includes(birdName)) divCell.classList.add("oiseau-unselected");

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
    bindListBirdCell(divCell);
    grid.appendChild(divCell);
  }
  
  updateListBirdCounter();
}

function bindListBirdCell(birdCell) {
  birdCell.addEventListener('mouseenter', () => {
    birdCell.dataset.hovered = "true";
  });
  birdCell.addEventListener('mouseleave', () => {
    birdCell.dataset.hovered = "false";
  });

  birdCell.addEventListener('click', () => {
    birdCell.classList.toggle('oiseau-unselected');
    updateListBirdCounter();
  });
}

function getListBirdCount() {
  const birdsCells = document.getElementById("list-bird-grid");
  let birdCount = 0;
  for (let cell of birdsCells.getElementsByClassName("cell")) {
    if (!cell.classList.contains("oiseau-unselected")) {
      birdCount++;
    }
  }
  return birdCount;
}

function updateListBirdCounter() {
  let birdCount = getListBirdCount();

  if (birdCount <= 1) {
    birdCount += " oiseau sélectionné";
  } else {
    birdCount += " oiseaux sélectionnés";
  }
  document.getElementById('listEditBirdCount').innerHTML = birdCount;
}





async function loadList({app}, listId) {
  if (app.loadedList != listId) {    // Seulement si on charge une autre liste que la liste actuelle
    app.loadedList = listId;

    await genererGrilleOiseaux({app}); // va appeler applySelectedList({app});
    
    // const listName = document.getElementById(`${listId}-name`).innerHTML;
    // app.loadedList = listId;
    // document.getElementById('loaded-list-name').innerHTML = listName;

    //todo: voir s'il faut lire un nouvel oiseau et reset le score (si on ne lit plus la même liste)
    // genre if loadedList est deja egal a la liste selectionnee
    resetBirds({app});
    playRandomBird({app});

    //todo: check s'il faut cacher les types (dans le cas où on ne choisit pas la liste par défaut: les sélectionner tous et les cacher)
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
  const listEditPage = document.getElementById('list-edit-page');

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
      if (child !== birdlistsElement && child !== listEditPage) {
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
    if (child !== birdlistsElement && child !== listEditPage) {
      child.classList.remove("fade-in", "fade-in-active");
    }
  });
  controlsElement.classList.remove("fade-in", "fade-in-active");
}

async function resetBirds({app}) {
  app.score = 0;
  app.total = 0;
  document.getElementById('score').textContent = `Oiseaux trouvés: -/-`;

  // if (app.autoplayAtStart) {
  //   playRandomBird({app});
  // }
  app.birdHasBeenPlayed = true;
  // playRandomBird({app});
  // loadApp();
}


export async function restoreBlindtestPage({app}) {
  animateBirdlistsFadeOut();
  toggleSoundControls(true);
  if (app.autoplayAtStart) {
    // togglePause();
    simulateClick(document.getElementById('pause-button'));
  }

}

export async function restoreMyListsPage({app}) {
  clearSearch();

  //todo: animer la transition
  loadBirdlistsPage({app})
  // document.getElementById('list-edit-page').classList.add("display-none");
  // document.getElementById("birdlists-page").classList.remove("display-none");
}