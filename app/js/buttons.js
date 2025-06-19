import { saveSettings } from './settings.js';
import { getSelectedTypes } from './strings.js';
import { genererGrilleOiseaux, playRandomBird, toggleReplayMode, togglePause, playNextVariant, muteAudio, slideVolume, showPopup } from '../main.js'



export function bindAllButtons({app, audio}) {
  bindWindow({app});
  bindTypes();
  bindSearchbar();
  bindPopup();
  bindBottomButtons({app, audio});
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
  
  // Fermer la fenêtre
  document.getElementById('close-button').addEventListener('click', async () => {
    // À la fermeture de l'application
    await saveSettings({
      isMaximized: app.isMaximized,
      replayMode: app.replayMode,
      lastVolume: app.lastVolume,
      volume: app.volume,
      muted: app.muted,
      selectedTypes: getSelectedTypes()
    });
    window.api.close();
  });
}

// Boutons de sélection des types
function bindTypes() {
  // Met à jour la liste des oiseaux après un click sur une checkbox
  document.querySelectorAll('#type-selection .button').forEach(btn => {
    btn.addEventListener('click', async () => {
      btn.classList.toggle('is-selected');
      await genererGrilleOiseaux();
      playRandomBird();
    });
  });
}

// Barre de recherche
function bindSearchbar() {
  document.getElementById('search-bar').addEventListener('input', (e) => searchBird(e));
  document.getElementById('clear-search').addEventListener('click', () => { clearSearch(); });
}

// Pop-up du résultat
function bindPopup() {
  // document.getElementById('close-popup-button').addEventListener('click', () => hidePopup());
  document.getElementById('close-popup-button').addEventListener('click', playRandomBird);
  document.getElementById('next-button').addEventListener('click', playRandomBird);
}

// Tous les boutons en bas de la fenêtre (essentiellement liés à l'audio)
function bindBottomButtons({app, audio}) {
  // Bouton de toggle du replay
  const replayModeButton = document.getElementById('replay-mode-button');
  replayModeButton.addEventListener('click', toggleReplayMode);

  // Au lancement de l'app, active ou désactive le bouton de toggle du replay
  if (app.replayMode) {
    replayModeButton.classList.add("activated");
    replayModeButton.classList.remove("deactivated");
  } else {
    replayModeButton.classList.remove("activated");
    replayModeButton.classList.add("deactivated");
  }
  
  // Bouton "reculer de 5s"
  document.getElementById('rewind-button').addEventListener('click', () => { audio.currentTime = Math.max(0, audio.currentTime - 5); });
  // Bouton "avancer de 5s"
  document.getElementById('forward-button').addEventListener('click', () => { audio.currentTime = Math.min(audio.duration, audio.currentTime + 5); });

  // Bouton pause
  document.getElementById('pause-button').addEventListener('click', togglePause);

  // Gestion du bouton replay

  document.getElementById('replay-button').addEventListener('click', () => {
    audio.currentTime = 0;
    audio.play().then(() => {
      document.getElementById('pause-button-img').src = "../ressources/images/pause-button.png";
      document.getElementById('bird-animation').src = "../ressources/images/oiseau_qui_chante.gif";
    }).catch(err => {
      console.error("Erreur lecture :", err);
    });
  });

  // Bouton "autre son de l'oiseau"
  document.getElementById('switch-button').addEventListener('click', playNextVariant);


  // Gestion du volume
  document.getElementById('volume-button').addEventListener('click', muteAudio);
  document.getElementById('volume-slider').addEventListener('input', slideVolume);


  // Boutons "Plus"
  document.getElementById('more-button').addEventListener('click', (e) => {
    e.stopPropagation(); // Empêche de propager au document
  
    const menu = document.getElementById('more-menu');
    const updateSearchButton = document.getElementById('update-search-button');
    const seeGithubButton = document.getElementById('see-github-button');
  
    menu.style.display = 'block';
    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY-100}px`;
  
    // Quand on clique sur "Chercher une mise à jour"
    updateSearchButton.onclick = () => {
      // todo: chercher une update
      document.getElementById('result-text').innerHTML = "Recherche de mise à jour...";
      document.getElementById('result-text').style.color = "black";
      showPopup();
      menu.style.display = 'none';
    };
    // Quand on clique sur "Voir le GitHub"
    seeGithubButton.onclick = () => {
      const link = `https://github.com/Hikikomori041/blindtest-oiseaux`;
      window.open(link, '_blank');
      menu.style.display = 'none';
    };
  });
}