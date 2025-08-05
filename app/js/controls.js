import { saveSettings } from './settings.js';
import { clearSearch, searchBird } from './search.js';
import { getSelectedTypes, slugify } from './strings.js';
import { playRandomBird, toggleReplayMode, togglePause, playNextVariant, muteAudio, slideVolume } from './player.js'
import { genererGrilleOiseaux, closePopup, hideShortcutsPopup, validate, listenToBird, showBirdCells } from './layout.js';
import { bindMoreMenu } from './controls-more.js';

export function bindAllButtons({app}) {
  bindWindow({app});
  bindTypes({app});
  bindBirds({app});
  bindBottomButtons({app});
  bindShortcuts({app});
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
    // À la fermeture de l'application
    await saveSettings({
      isMaximized: app.isMaximized,
      winWidth: app.winWidth,
      winHeight: app.winHeight,
      replayMode: app.replayMode,
      lastVolume: app.lastVolume,
      volume: app.volume,
      muted: app.muted,
      confirmSoundMuted: app.confirmSoundMuted,
      autoplayAtStart: app.autoplayAtStart,
      selectedTypes: getSelectedTypes()
    });
    window.api.close();
  });
}

// Boutons de sélection des types
function bindTypes({app}) {
  // Met à jour la liste des oiseaux après un click sur une checkbox
  document.querySelectorAll('#type-selection .button').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.classList.toggle('is-selected');
      clearSearch();
      await genererGrilleOiseaux({app});
      showBirdCells();
      playRandomBird({app});
    });
  });
}

function bindBirds({app}) {
  // Barre de recherche
  document.getElementById('search-bar').addEventListener('input', (e) => searchBird(e));
  document.getElementById('clear-search').addEventListener('click', () => { clearSearch(); });

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

  document.getElementById('next-bird-button').addEventListener('click', () => { showBirdCells({app}); playRandomBird({app}); });
}

export function bindBirdCell(birdCell, birdName, {app}) {
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
      app.currentBird = birdName;
      listenToBird({app});
      menu.style.display = 'none';
    };
    // Quand on clique sur "Plus d'infos"
    seeButton.onclick = () => {
      const link = `https://www.oiseaux.net/oiseaux/${slugify(birdName)}.html`;
      console.log(link);
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
        document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
        document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
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
      document.getElementById('pause-button-img').src = "../ressources/images/play-button.png";
      document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante_pas.png";
      window.api.updateThumbar(app.audio.paused, app.muted);
    }
  });
}


// document.getElementById('update-search-button').onclick = async () => {
//   try {
//     const remoteVersion = await window.api.checkUpdate();
//     const localVersion = await window.api.getVersion();

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

// Fonction qui permet de savoir si le programme doit être mis à jour
// function compareVersions(v1, v2) {
//   console.log("Git:",v1,"Local:",v2);
//   const v1parts = v1.split('.').map(Number);
//   const v2parts = v2.split('.').map(Number);

//   for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
//     const a = v1parts[i] || 0;
//     const b = v2parts[i] || 0;

//     if (a > b) return 1;
//     if (a < b) return -1;
//   }
//   return 0;
// }


// Tous les raccourcis clavier et souris
function bindShortcuts({app}) {
  const volumeSlider = document.getElementById('volume-slider');
  // Bind des raccourcis clavier
  document.addEventListener('keydown', (e) => {
    // Si on est en train de taper dans un input ou textarea, on ignore le raccourci
    const activeElement = document.activeElement;
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      return;
    }
    
    // Fermer la fenêtre avec Ctrl+W
    if (e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault();
      window.close();
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
      if (document.getElementById('result-popup').classList.contains('active')) {
        simulateClick(document.getElementById('next-button'));
      } else {
        simulateClick(document.getElementById('pause-button'));
      }
    }
    else if (e.code === 'ArrowUp') {
      e.preventDefault();
      volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);;
      slideVolume({app});
    }
    else if (e.code === 'ArrowDown') {
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
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

  volumeSlider.addEventListener('wheel', (e) => {
    if (e.deltaY > 0) {
      e.preventDefault();
      volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 5);
      slideVolume({app});
    } else if (e.deltaY < 0) {
      e.preventDefault();
      volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 5);;
      slideVolume({app});
    }
  });
  
  
  function simulateClick(button) {
    button.classList.add('active');
    setTimeout(() => {
        button.classList.remove('active');
    }, 150); // durée de l'animation en ms
    button.click(); // optionnel si tu veux aussi déclencher l’action du bouton
  }
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