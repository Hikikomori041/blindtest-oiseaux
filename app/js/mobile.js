// Mise en page mobile : bandeau du haut (bouton menu, liste, score), menu latéral (listes, catégories,
// paramètres) et lecteur simplifié. Appelé seulement sur mobile (init.js) ; le style est dans css/mobile.css.
//
// Les éléments existants sont réutilisés (déplacés ou recopiés) pour garder une seule logique avec le desktop :
// les tuiles du menu « Plus » deviennent les lignes du menu latéral, avec leurs écouteurs de clic.

import { platform } from './platform/index.js';
import { updateTiles } from './layout.js';

const byId = (id) => document.getElementById(id);

const MENU_ICON = `<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
  <path d="M4 6h16M4 12h16M4 18h16"/></svg>`;

export function setupMobileLayout({app}) {
  buildTopbar();
  buildDrawer({app});
  rearrangePlayer({app});
}


// ── Bandeau du haut ──

function buildTopbar() {
  const topbar = document.createElement('header');
  topbar.id = 'mobile-topbar';
  topbar.innerHTML = `
    <button id="drawer-button" aria-label="Menu">${MENU_ICON}</button>
    <div id="topbar-titles">
      <span id="topbar-title">Blind-Test Oiseaux</span>
      <span id="topbar-subtitle"></span>
    </div>
    <span id="topbar-score" aria-label="Oiseaux trouvés">-/-</span>
  `;
  // Dans #content : masqué avec le reste de la page quand on ouvre les listes (birdlists.js)
  byId('content').prepend(topbar);

  byId('drawer-button').addEventListener('click', (e) => {
    e.stopPropagation();
    openDrawer();
  });

  // Les textes d'origine (colonne de gauche, masquée sur mobile) restent la source :
  // on les recopie en version courte dès qu'ils changent
  const listName = byId('loaded-list-name');
  const birdCount = byId('birdCount');
  const score = byId('score');

  const refresh = () => {
    const count = birdCount.textContent.replace(/\s*sélectionnés?$/, '');
    byId('topbar-subtitle').textContent = `${listName.textContent} · ${count}`;
    byId('topbar-score').textContent = score.textContent.split(':').pop().trim();
    refreshDrawerItems();
  };
  const observer = new MutationObserver(refresh);
  for (const element of [listName, birdCount, score]) {
    observer.observe(element, { childList: true, characterData: true, subtree: true });
  }
  refresh();
}


// ── Menu latéral ──

function drawerItem(id, icon, label) {
  const item = document.createElement('button');
  item.id = id;
  item.className = 'drawer-item';
  item.innerHTML = `
    <span class="drawer-item-icon">${icon}</span>
    <span class="drawer-item-text">
      <span class="drawer-item-label">${label}</span>
      <span class="drawer-item-detail"></span>
    </span>`;
  return item;
}

function drawerSection(title) {
  const section = document.createElement('div');
  section.className = 'drawer-section';
  section.textContent = title;
  return section;
}

function buildDrawer({app}) {
  const overlay = document.createElement('div');
  overlay.id = 'drawer-overlay';

  const drawer = document.createElement('nav');
  drawer.id = 'drawer';
  drawer.innerHTML = `
    <div id="drawer-header">
      <img src="${platform.resourceUrl('images/oiseau.png')}" alt="">
      <div>
        <div id="drawer-title">Blind-Test Oiseaux</div>
        <div id="drawer-version"></div>
      </div>
    </div>
  `;

  const listsItem = drawerItem('drawer-lists', '📋', 'Mes listes');
  const typesItem = drawerItem('drawer-types', '🏷️', 'Catégories');

  drawer.append(drawerSection('Jeu'), listsItem, typesItem, drawerSection('Paramètres'));
  // Les tuiles du menu « Plus » (avec leurs écouteurs de clic) deviennent des lignes du menu
  for (const id of ['toggle-confirm-sound-tile', 'toggle-autoplay-tile', 'change-birds-size-tile', 'offline-sounds-tile']) {
    drawer.append(byId(id));
  }
  drawer.append(drawerSection('À propos'));
  for (const id of ['see-github-tile', 'report-issue-tile']) {
    const tile = byId(id);
    tile.addEventListener('click', closeDrawer); // le lien s'ouvre dans le navigateur
    drawer.append(tile);
  }

  document.body.append(overlay, drawer);
  // Le choix des catégories (#type-popover) reste dans #type-selection : le code qui lit les
  // catégories cochées le cherche là. mobile.css masque le reste de la colonne de gauche.

  platform.getVersion().then(version => { byId('drawer-version').textContent = `Version ${version}`; });

  overlay.addEventListener('click', closeDrawer);
  // Les clics dans le menu ne doivent pas fermer les menus ouverts via les écouteurs du document
  drawer.addEventListener('click', (e) => e.stopPropagation());

  listsItem.addEventListener('click', () => {
    closeDrawer();
    byId('my-lists-button').click();
  });
  typesItem.addEventListener('click', () => {
    closeDrawer();
    byId('type-popover-toggle').click();
  });

  // Glisser vers la gauche pour fermer
  let startX = null;
  drawer.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  drawer.addEventListener('touchend', (e) => {
    if (startX !== null && startX - e.changedTouches[0].clientX > 60) closeDrawer();
    startX = null;
  });

  updateTiles({app});
}

function refreshDrawerItems() {
  const listsDetail = document.querySelector('#drawer-lists .drawer-item-detail');
  const typesDetail = document.querySelector('#drawer-types .drawer-item-detail');
  if (!listsDetail) return; // menu pas encore construit
  listsDetail.textContent = byId('loaded-list-name').textContent;
  typesDetail.textContent = `${byId('type-popover-count').textContent.replace(/[()]/g, '')} sélectionnées`;
}

let drawerApp = null;

function openDrawer() {
  if (drawerApp) updateTiles({app: drawerApp}); // nombre de sons hors ligne à jour
  refreshDrawerItems();
  document.body.classList.add('drawer-open');
}

export function closeDrawer() {
  document.body.classList.remove('drawer-open');
}

export function isDrawerOpen() {
  return document.body.classList.contains('drawer-open');
}


// ── Lecteur ──

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00';
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function rearrangePlayer({app}) {
  drawerApp = app;

  // Barre de progression encadrée par le temps écoulé et la durée
  const slider = byId('audio-slider');
  const row = document.createElement('div');
  row.id = 'progress-row';
  row.innerHTML = '<span id="time-current">0:00</span><span id="time-total">0:00</span>';
  slider.replaceWith(row);
  row.insertBefore(slider, byId('time-total'));

  const updateTimes = () => {
    const hasSound = app.audio.src && Number.isFinite(app.audio.duration);
    byId('time-current').textContent = formatTime(hasSound ? app.audio.currentTime : 0);
    byId('time-total').textContent = formatTime(hasSound ? app.audio.duration : 0);
  };
  for (const event of ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied', 'seeked']) {
    app.audio.addEventListener(event, updateTimes);
  }

  // Boutons : [boucle]  [réécouter] [lecture] [autre son]  [muet]
  // (le bouton « Plus », reculer / avancer, le volume et le plein écran sont masqués par mobile.css)
  byId('controls-left').append(byId('replay-mode-button'));
}
