import { saveSettings } from './settings.js';
import { clearSearch, searchBird } from './search.js';
import { getSelectedTypes, slugify } from './strings.js';
import { loadBirdlistsPage, saveList, deleteList, loadList, openListEditPage, restoreMyListsPage } from './birdlists.js';
import { playBird, playRandomBird, toggleReplayMode, togglePause, playNextVariant, muteAudio, slideVolume } from './player.js'
import { genererGrilleOiseaux, closePopup, hideShortcutsPopup, validate, listenToBird, showBirdCells } from './layout.js';
import { bindMoreMenu, toggleFullscreen } from './controls-more.js';

async function saveAndCloseApp({app}) {
  await saveSettings({
    isMaximized: app.isMaximized,
    winWidth: app.winWidth,
    winHeight: app.winHeight,

    volume: app.volume,
    muted: app.muted,
    lastVolume: app.lastVolume,
    replayMode: app.replayMode,

    autoplayAtStart: app.autoplayAtStart,
    birdsSize: app.birdsSize,
    loadedList: app.loadedList,
    selectedTypes: getSelectedTypes(),
    validationSoundMuted: app.validationSoundMuted,
  });

  window.api.close();
}

export function bindAllButtons({app}) {
  app.enterPressed = false;

  bindWindow({app});
  bindTypes({app});
  bindShortcuts({app});
  
  bindSearchBars({app});
  bindBirds({app});

  bindBottomButtons({app});
  
  bindMyListsButtons({app});

  document.addEventListener('keyup', (e) => {
    if (e.code === 'Enter') app.enterPressed = false;
  });

}


// Mes listes
function bindMyListsButtons({app}) {
  // L'action du bouton retour de l'écran des listes persos
  document.getElementById('back-button').addEventListener("click", (_) => {
    loadList({app}, app.loadedList);
  });

  // L'action du bouton retour de l'écran d'édition de liste
  document.getElementById('list-edit-save-button').addEventListener("click", (_) => {
    saveList({app});
    restoreMyListsPage({app});
  });
  document.getElementById('list-edit-back-button').addEventListener("click", (_) => {
    restoreMyListsPage({app});
  });
  document.getElementById('list-edit-delete-button').addEventListener("click", (_) => {
    deleteList({app});
    restoreMyListsPage({app});
  });

  
  // Création d'une nouvelle liste
  document.getElementById("create-list-button").addEventListener('click', async () => {
    // On défini le nouveau nom et le nouvel id
    let listCount = Object.keys(app.myLists).length;
    let newListId = 1; // Si aucune liste, alors il vaut 1
    if (Object.keys(app.myLists).length !== 0) {
      // Sinon il vaut le plus grand id de la liste + 1 //todo: à vérifier
      newListId = Math.max(...Object.keys(app.myLists).map(Number)) + 1;
    }

    let newList = {
      "name": `Liste ${listCount+1}`,
      "birds": []
    }
    newListId = `list-` + newListId;

    // On crée la nouvelle liste
    await window.api.saveList(newListId, newList);
    // console.log("on crée une nouvelle liste: ");

    // On charge la liste
    app.myLists = await window.api.getAllLists();
    app.loadedList = newListId;
    // app.myLists[newListId] = newList;

    // On affiche la page d'édition de la liste
    openListEditPage({app}, newListId);
  });
}

// Fonction qui bind leurs actions aux boutons de la fenêtre
function bindWindow({app}) {
  // Minimiser la fenêtre
  document.getElementById('minimize-button').addEventListener('click', () => window.api.minimize());
  
  // Agrandir ou réduire la fenêtre
  const maximizeButton = document.getElementById('maximize-button');
  maximizeButton.addEventListener('click', () => {
    window.api.maximize();
    app.isMaximized = !app.isMaximized;
  });
  window.api.onWindowMaximize(() => {
    maximizeButton.innerHTML = '🗗';
    app.isMaximized = true;
    maximizeButton.title = "Réduire la fenêtre";
  });
  window.api.onWindowUnmaximize(() => {
    maximizeButton.innerHTML = '🗖';
    app.isMaximized = false;
    maximizeButton.title = "Agrandir la fenêtre";
  });

  window.addEventListener('resize', () => {
    if (!app.isMaximized) {
      app.winWidth = window.outerWidth;
      app.winHeight = window.outerHeight;
    }
  });

  
  // Fermer la fenêtre
  document.getElementById('close-button').addEventListener('click', async () => {
    await saveAndCloseApp({app});
  });
}

// Boutons de sélection des types
function bindTypes({app}) {
  const typeSection = document.getElementById('type-selection');
  const typePopover = document.getElementById('type-popover');
  const typePopoverToggle = document.getElementById('type-popover-toggle');
  const typePopoverCount = document.getElementById('type-popover-count');
  const typeSelectedChips = document.getElementById('type-selected-chips');
  const typeSearchInput = document.getElementById('type-search');
  const typeOptions = document.getElementById('type-options');

  function getTypeButtons() {
    return [...typeSection.querySelectorAll('.type-option[data-type]')];
  }

  function updateTypeSelectionSummary() {
    const typeButtons = getTypeButtons();
    const selectedButtons = typeButtons.filter(btn => btn.classList.contains('is-selected'));
    const selectedCount = selectedButtons.length;
    const totalCount = typeButtons.length;

    if (typePopoverCount) {
      typePopoverCount.textContent = `(${selectedCount}/${totalCount})`;
    } else {
      typePopoverToggle.textContent = `Catégories\n(${selectedCount}/${totalCount})`;
    }

    if (!typeSelectedChips) return;

    if (selectedCount === 0) {
      typeSelectedChips.innerHTML = '<span class="type-chip type-chip-empty">Aucune catégorie</span>';
      return;
    }

    const chipsHtml = selectedButtons.map((btn) => {
      const type = btn.dataset.type || '';
      const label = btn.dataset.chipName || '';
      return `<span class="type-chip type-${type}">${label}</span>`;
    }).join('');

    typeSelectedChips.innerHTML = chipsHtml;
  }

  function filterTypeButtons() {
    const query = typeSearchInput.value.trim().toLowerCase();
    getTypeButtons().forEach(btn => {
      const isMatch = (btn.dataset.chipName || '')
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .includes(query);
      btn.classList.toggle('display-none', !isMatch);
    });
  }

  function setPopoverVisibility(isVisible) {
    typePopover.classList.toggle('display-none', !isVisible);
    typePopover.setAttribute('aria-hidden', isVisible ? 'false' : 'true');
    if (isVisible) {
      typeSearchInput.focus();
    }
  }

  async function refreshAfterTypeChange() {
    await genererGrilleOiseaux({app});
    showBirdCells();
    playRandomBird({app});
    updateTypeSelectionSummary();
  }

  typePopoverToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = typePopover.classList.contains('display-none');
    setPopoverVisibility(isHidden);
  });

  typePopover.addEventListener('click', (e) => {
    e.stopPropagation();
  });

  typeSearchInput.addEventListener('input', () => {
    filterTypeButtons();
  });

  typeSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setPopoverVisibility(false);
      typePopoverToggle.focus();
    }
  });

  typeOptions.addEventListener('click', async (e) => {
    const targetButton = e.target.closest('.type-option[data-type]');
    if (!targetButton) return;

    targetButton.classList.toggle('is-selected');
    await refreshAfterTypeChange();
  });

  document.getElementById('type-select-all').addEventListener('click', async () => {
    getTypeButtons().forEach(btn => btn.classList.add('is-selected'));
    await refreshAfterTypeChange();
  });

  document.getElementById('type-select-none').addEventListener('click', async () => {
    getTypeButtons().forEach(btn => btn.classList.remove('is-selected'));
    await refreshAfterTypeChange();
  });

  // document.getElementById('type-select-invert').addEventListener('click', async () => {
  //   getTypeButtons().forEach(btn => btn.classList.toggle('is-selected'));
  //   await refreshAfterTypeChange();
  // });

  document.addEventListener('click', () => {
    setPopoverVisibility(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      setPopoverVisibility(false);
    }
  });

  document.addEventListener('types:updated', () => {
    updateTypeSelectionSummary();
  });

  updateTypeSelectionSummary();

  document.getElementById('my-lists-button').addEventListener('click', () => { 
    togglePause({app}, true);
    toggleSoundControls(false);

    app.previousBirdList = app.birdList; // pour checker les changements de la liste chargée
    // Charger la nouvelle vue
    loadBirdlistsPage({app});
  });
}

function bindSearchBars({app}) {
  // Barre de recherche (page du Blind-Test)
  const searchBar = document.getElementById('search-bar');
  if (!searchBar) return;

  searchBar.addEventListener('input', (e) => searchBird(e));
  document.getElementById('clear-search').addEventListener('click', () => { clearSearch(); });


  // Pour sélectionner le premier oiseau de la recherche pendant le Blind-Test en appuyant sur Entrée
  const birdGrid = document.getElementById('bird-grid');

  searchBar.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (searchBar.value === "") {
        searchBar.blur();
        return;
      }

      app.enterPressed = true;
      const firstBird = Array.from(birdGrid.querySelectorAll('.cell')).find(cell => !cell.classList.contains('display-none'));

      if (firstBird) {
        // console.log(firstBird);
        firstBird.click();
        searchBar.blur();
      } else {
        clearSearch();
      }
    } else if (e.key === 'Escape') {
      searchBar.blur(); // enlève le focus
    }
  });

  
  // Barre de recherche (page d'édition de liste)

  const searchBarListEdit = document.getElementById('search-bar-list-edit');
  if (!searchBarListEdit) return;

  searchBarListEdit.addEventListener('input', (e) => searchBird(e));
  document.getElementById('clear-search-list-edit').addEventListener('click', () => { clearSearch(); });

  searchBarListEdit.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      clearSearch();
      searchBarListEdit.blur();
    }
  });
}

function bindBirds({app}) {
  // Pop-up de résultat
  document.getElementById('close-popup-button').addEventListener('click', () => { closePopup(); playRandomBird({app}); } );
  document.getElementById('close-shortcuts-popup-button').addEventListener('click', () => { hideShortcutsPopup(); } );
  document.getElementById('close-shortcuts-popup-button2').addEventListener('click', () => { hideShortcutsPopup(); } );
  document.getElementById('next-button').addEventListener('click', () => { closePopup(); playRandomBird({app}); });
  
  // Menu contextuel
  // Clic ailleurs → on ferme le menu
  document.addEventListener('click', () => {
    const ctxMenu = document.getElementById('context-menu');
    if (ctxMenu) ctxMenu.style.display = 'none';
    // document.getElementById('tiles-container').style.display = 'none';//todo: voir si y en a besoin ici pour tiles-container
  });

  // Quand on a fait "Écouter cet oiseau"
  // Bouton pour revenir à l'oiseau précédent
  document.getElementById('previous-bird-button').addEventListener('click', () => {
    clearSearch();
    showBirdCells();
    app.currentBird = app.previousBird;
    playBird({app});
    // stopAudio({app});
    // app.audio       = app.previousAudio;
    // startAudio({app});
  });
}

export function bindBirdCell(birdCell, birdName, {app}) {
  birdCell.addEventListener('mouseenter', () => {
    birdCell.dataset.hovered = "true";
  });
  birdCell.addEventListener('mouseleave', () => {
    birdCell.dataset.hovered = "false";
  });

  birdCell.addEventListener('click', () => validate(birdName, {app}));
  birdCell.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const menu = document.getElementById('context-menu');
    const listenButton = document.getElementById('listen-bird-button');
    const seeButton = document.getElementById('see-bird-button');

    menu.style.display = 'block';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;

    // Quand on clique sur "Écouter"
    listenButton.onclick = () => {
      // app.previousAudio = app.audio;
      app.previousBird  = app.currentBird;
      app.currentBird = birdName;
      listenToBird({app});
      menu.style.display = 'none';
    };
    // Quand on clique sur "Plus d'infos"
    seeButton.onclick = () => {
      const link = `https://www.oiseaux.net/oiseaux/${slugify(birdName)}.html`;
      // console.log(link);
      window.open(link, '_blank');
      menu.style.display = 'none';
    };
  });
}

// Tous les boutons en bas de la fenêtre (essentiellement liés à l'audio)
function bindBottomButtons({app}) {
  bindAudioButtons({app});
  bindVolumeInputs({app});

  bindMoreMenu({app});
}


function bindAudioButtons({app}) {
  // Bouton de toggle du replay
  const replayModeButton = document.getElementById('replay-mode-button');
  replayModeButton.addEventListener('click', () => { toggleReplayMode({app}); });

  // Au lancement de l'app, active ou désactive le bouton de toggle du replay
  if (app.replayMode) {
    replayModeButton.classList.add("activated");
    replayModeButton.classList.remove("deactivated");
  } else {
    replayModeButton.classList.remove("activated");
    replayModeButton.classList.add("deactivated");
  }
  
  // Bouton "reculer de 5s"
  document.getElementById('rewind-button').addEventListener('click', () => { app.audio.currentTime = Math.max(0, app.audio.currentTime - 5); });
  // Bouton "avancer de 5s"
  document.getElementById('forward-button').addEventListener('click', () => { app.audio.currentTime = Math.min(app.audio.duration, app.audio.currentTime + 5); });

  // Bouton pause
  document.getElementById('pause-button').addEventListener('click', () => { togglePause({app}); } );

  // Gestion du bouton replay
  document.getElementById('replay-button').addEventListener('click', () => {
    app.audio.currentTime = 0;
    app.audio.preload = 'auto';
    app.audio.load();
    app.audio.oncanplaythrough = () => {
      app.audio.play().then(() => {
        document.getElementById('pause-button-img').src = "res://images/pause-button.png";
        document.getElementById('bird-animation').src = "res://images/oiseau_qui_chante.gif";
      }).catch(err => {
        console.error("Erreur lecture :", err);
      });
    };
  });

  // Bouton "autre son de l'oiseau"
  document.getElementById('switch-button').addEventListener('click', () => { playNextVariant({app}); } );
}

function bindVolumeInputs({app}) {
  // Gestion du volume
  document.getElementById('volume-button').addEventListener('click', () => { muteAudio({app}); } );
  document.getElementById('volume-slider').addEventListener('input', () => { slideVolume({app}); } );

  // Si l'utilisateur clique sur le slider du volume
  const audioSlider = document.getElementById('audio-slider');
  audioSlider.addEventListener('input', () => {
    if (!app.audio || !app.audio.duration) return;

    const percent = audioSlider.value;
    app.audio.currentTime = (percent / 100) * app.audio.duration;
  });

  // Action automatique à la fin de la lecture du son
  app.audio.addEventListener('ended', () => {
    if (app.replayMode) {
      app.audio.currentTime = 0;
      app.audio.play();
    } else {
      document.getElementById('pause-button-img').src = "res://images/play-button.png";
      document.getElementById('bird-animation').src = "res://images/oiseau_qui_chante_pas.png";
      window.api.updateThumbar(app.audio.paused, app.muted);
    }
  });
}

// Tous les raccourcis clavier et souris
function bindShortcuts({app}) {
  const volumeSlider = document.getElementById('volume-slider');
  // Bind des raccourcis clavier
  document.addEventListener('keydown', async (e) => {
    // Si on est en train de taper dans un input ou textarea, on ignore le raccourci
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      return;
    }
    
    // Fermer la fenêtre avec Ctrl+W
    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault();
      await saveAndCloseApp({app});
      return;
    }


    if (e.code === 'KeyM') {
      e.preventDefault();
      simulateClick(document.getElementById('volume-button'));
    }
    else if (e.code === 'KeyR') {
      e.preventDefault();
      simulateClick(document.getElementById('replay-button'));
    }
    else if (e.code === 'KeyP') {
      e.preventDefault();
      simulateClick(document.getElementById('switch-button'));
    }
    else if (e.code === 'Space') {
      e.preventDefault();
      simulateClick(document.getElementById('pause-button'));
    }
    else if (e.code === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
    else if (e.code === 'Enter') {
      e.preventDefault();

      if (app.enterPressed || e.repeat) { e.preventDefault(); return; }
      app.enterPressed = true;
      e.preventDefault();

      // si une cell est survolée, on la clique
      const hoveredCell = document.querySelector('.cell[data-hovered="true"]');
      if (hoveredCell) {
        hoveredCell.click();
        return;
      }

      if (document.getElementById('result-popup').classList.contains('active')) {
        simulateClick(document.getElementById('next-button'));
      }
    }
    else if (e.code === 'ArrowUp') {
      e.preventDefault();
      volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);
      flashTooltip(volumeSlider, `${volumeSlider.value}%`, 400);
      slideVolume({app});
    }
    else if (e.code === 'ArrowDown') {
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
      flashTooltip(volumeSlider, `${volumeSlider.value}%`, 400);
      slideVolume({app});
    }
    else if (e.code === 'ArrowRight') {
      e.preventDefault();
      simulateClick(document.getElementById('forward-button'));
    }
    else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      simulateClick(document.getElementById('rewind-button'));
    }
  });

  document.addEventListener('keyup', (e) => {
    // Ctrl tout seul -> focus recherche (sur keyup pour ne pas casser les combos)
    if ((e.code === 'ControlLeft' || e.code === 'ControlRight')
        && !e.shiftKey && !e.altKey && !e.metaKey && !e.ctrlKey && !e.repeat) {
      const searchBar = document.getElementById('search-bar');
      if (searchBar) searchBar.focus();
    }
  });

  volumeSlider.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
      slideVolume({app});
    } else if (e.deltaY < 0) {
      e.preventDefault();
      volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);
      slideVolume({app});
    }
  });
}

// Simule un clic sur un bouton (avec l'effet de clic)
export function simulateClick(button) {
  button.classList.add('active');
  setTimeout(() => {
      button.classList.remove('active');
  }, 150); // durée de l'animation en ms
  button.click(); // optionnel si tu veux aussi déclencher l’action du bouton
}

// Toggle les contrôles de l'audio quand aucun oiseau n'est disponible
export function toggleSoundControls(activate = true) {
  let buttons = [
    document.getElementById('audio-slider'),
    document.getElementById('replay-button'),
    document.getElementById('rewind-button'),
    document.getElementById('pause-button'),
    document.getElementById('forward-button'),
    document.getElementById('switch-button')
  ];
  for (let button of buttons) {
    button.disabled = !activate;
    if (activate) {
      button.classList.remove("disabled");
    } else {
      button.classList.add("disabled");
    }
  }
}

// Associe les actions de la taskbar à l'application
export function loadTaskbarButtons({app}) {
  window.api.onPlayerControl((action) => {
    if (action === 'play-pause') {
      togglePause({app}); // ta fonction existante
    }
    else if (action === 'mute-unmute') {
      muteAudio({app}); // ta fonction existante
    }
  });
}

// Pour afficher brièvement le tooltip d'un élément (hors survol de la souris)
function flashTooltip(el, text, ms = 400) {
  if (!el) return;
  if (text != null) el.setAttribute('data-tooltip', text);
  el.classList.add('tooltip-show');
  clearTimeout(el._tt);
  el._tt = setTimeout(() => el.classList.remove('tooltip-show'), ms);
}





// document.getElementById('update-search-button').onclick = async () => {
//   try {
//     const remoteVersion = await window.api.checkUpdate();
//     const localVersion = await window.api.getVersion();
//
//     if (compareVersions(remoteVersion, localVersion) > 0) {
//       alert(`Nouvelle version dispo : v${remoteVersion} (vous avez v${localVersion})`);
//     } else {
//       alert(`Pas de mise à jour : vous êtes à jour (v${localVersion})`);
//     }
//   } catch (err) {
//     console.error(err);
//     alert('Impossible de vérifier les mises à jour.');
//   }
// }
//
// Fonction qui permet de savoir si le programme doit être mis à jour
// function compareVersions(v1, v2) {
//   console.log("Git:",v1,"Local:",v2);
//   const v1parts = v1.split('.').map(Number);
//   const v2parts = v2.split('.').map(Number);

//   for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
//     const a = v1parts[i] || 0;
//     const b = v2parts[i] || 0;
//
//     if (a > b) return 1;
//     if (a < b) return -1;
//   }
//   return 0;
// }