
import { playRandomBird } from './player.js'
import { showOverlay, hideOverlay, closePopup, showShortcutsPopup, hideShortcutsPopup, updateTiles } from './layout.js';

export function bindMoreMenu({app}) {
  // Bouton "Plus"
  document.getElementById('more-button').addEventListener('click', async () => {
    // closePopup({app});
    const moreMenu = document.getElementById('more-menu');

    if (moreMenu.classList.contains('hidden')) {
      // On affiche le menu
      openMoreMenu();
    } else {
      // On cache le menu
      closeMoreMenu();
    }
  });

  // Bouton pour fermer les tiles
  document.getElementById('close-tiles-button').addEventListener('click', () => {
    document.getElementById('more-button').click();
    });
    document.getElementById('overlay').addEventListener('click', () => {
    if (document.getElementById('more-menu').classList.contains('visible')) {
      // On cache le menu
      closeMoreMenu();
    } else {
      // On ferme la pop-up
      if (document.getElementById('shortcuts-popup').classList.contains('active')) {
        hideShortcutsPopup();
      } else if (document.getElementById('result-popup').classList.contains('active')) {
        closePopup({app});
        playRandomBird({app});
      }
    }
  });

  // Tiles du bouton "Plus"  
  // Tile "Voir mes listes persos"
  document.getElementById('see-shortcuts-tile').addEventListener('click', () => {
    // On cache le menu
    closeMoreMenu();
    showShortcutsPopup();
  });
  
  // Tile "Signaler un bug"
  document.getElementById('report-issue-tile').addEventListener('click', () => {
    // On ouvre GitHub sur la page de création d'une nouvelle issue
    const link = `https://github.com/Hikikomori041/blindtest-oiseaux/issues/new`;
    window.open(link, '_blank');

    // On cache le menu
    closeMoreMenu();
  });

  // Tile "Voir les sources"
  document.getElementById('see-github-tile').addEventListener('click', () => {
    // On ouvre GitHub sur un navigateur intégré
    const link = `https://github.com/Hikikomori041/blindtest-oiseaux/tree/main`;
    window.open(link, '_blank');

    // On cache le menu
    closeMoreMenu();
  });

  // Tile "Changer la taille des cell des oiseaux"
  document.getElementById('change-birds-size-tile').addEventListener('click', () => {
    const birdsTileImg = document.getElementById('birds-tile-img');
    const birdsTileSpan = document.getElementById('birds-tile-span');

    if (app.birdsSize === "big") {
      // Passe de gros à petit
      app.birdsSize = "small";
      birdsTileSpan.innerHTML = "Taille des oiseaux: petite";

    } else if (app.birdsSize === "small") {
      // Passe de petit à moyen
      app.birdsSize = "default";
      birdsTileSpan.innerHTML = "Taille des oiseaux: par défaut";

    } else { // contains default
      // Passe de moyen à gros
      app.birdsSize = "big";
      birdsTileSpan.innerHTML = "Taille des oiseaux: grande";
    }

    // Applique le changement à la tile
    birdsTileImg.classList.remove("small", "default", "big");
    birdsTileImg.classList.add(app.birdsSize);

    // Applique le changement à la grille d'oiseaux
    const birdGrid = document.getElementById('bird-grid');
    
    if (app.birdsSize == "small") {
      birdGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(240px, 1fr))";
    } else if (app.birdsSize == "default") {
      birdGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(300px, 1fr))";
    } else { //big
      birdGrid.style.gridTemplateColumns = "repeat(auto-fill, minmax(360px, 1fr))";
    }

    // Applique le changement à toutes les cell d'oiseaux
    for (let birdCell of document.getElementById('bird-grid').getElementsByClassName('cell')) {
      birdCell.classList.remove("small", "default", "big");
      birdCell.classList.add(app.birdsSize);
    }

  });

  // Tile "Activer / désactiver le son de validation"
  document.getElementById('toggle-confirm-sound-tile').addEventListener('click', () => {
    app.validationSoundMuted = !app.validationSoundMuted;

    // On change l'affichage
    updateTiles({app});
  });
  


  // Tile "Activer / désactiver la lecture automatique au démarrage"
  document.getElementById('toggle-autoplay-tile').addEventListener('click', () => {
    app.autoplayAtStart = !app.autoplayAtStart;

    // On change l'affichage
    updateTiles({app});
  });


  document.getElementById("fullscreen-button").addEventListener("click", toggleFullscreen);

}


export async function toggleFullscreen() {
  const isFullscreen = await window.api.toggleFullscreen();
  const fullscreenButton = document.getElementById("fullscreen-button");
  const appBar = document.getElementById("titlebar");
  const content = document.getElementById('blindtest-content');

  if (isFullscreen) {
    fullscreenButton.classList.add("activated");
    appBar.classList.add("hidden");
    content.classList.remove('mt-5');
  } else {
    fullscreenButton.classList.remove("activated");
    appBar.classList.remove("hidden");
    content.classList.add('mt-5');
  }
}




function openMoreMenu() {
  showOverlay(100);
  const moreMenu = document.getElementById('more-menu');
  moreMenu.classList.remove('hidden');
    // Trigger reflow to allow transition
    void moreMenu.offsetWidth;
  moreMenu.classList.add('visible');

  const tiles = moreMenu.querySelectorAll('.tile');
  tiles.forEach((tile, index) => {
    setTimeout(() => {
    tile.classList.add('visible');
    }, index * 50); // delay de 100ms entre chaque tile
  });
}

function closeMoreMenu() {
  hideOverlay();
  const moreMenu = document.getElementById('more-menu');
  const tiles = moreMenu.querySelectorAll('.tile');
  tiles.forEach(tile => tile.classList.remove('visible'));

  moreMenu.classList.remove('visible');
  moreMenu.addEventListener('transitionend', () => {
    moreMenu.classList.add('hidden');
  }, { once: true });
}