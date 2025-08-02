import { restorePreviousContent } from './birdlists.js';
import { getApp } from './init.js';

birdlistMain();

async function birdlistMain() {
  let app = await getApp();
  if (!app.birdsData) {
    console.error("app.birdsData est introuvable !");
    return;
  }

  const list = document.getElementById('bird-list');

  Object.entries(app.birdsData).forEach(([nomFrancais, data]) => {
    const item = document.createElement('li');
    item.textContent = `${nomFrancais} (${data.nom_latin}) – ${data.type}`;
    list.appendChild(item);
  });

  document.getElementById('back-button').addEventListener('click', () => {
    restorePreviousContent();
  });
};