import { getApp, loadApp } from "./init.js";
import { playRandomBird } from "./player.js";
import { toggleSoundControls } from './controls.js';

let previousBirdlistElement = null;

document.addEventListener('DOMContentLoaded', async () => {
  document.addEventListener("click", (e) => {
    if (e.target.id === "back-button") {
      restorePreviousContent();
    }
  });
})




export async function loadBirdlistIntoContent() {
  const response = await fetch('birdlists.html');
  const htmlText = await response.text();

  const contentElement = document.getElementById('content');

  // 1. Cache le contenu actuel
  Array.from(contentElement.children).forEach(child => {
    child.style.display = 'none';
  });

  // 2. Crée un conteneur pour la birdlist si pas déjà présent
  if (!previousBirdlistElement) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    previousBirdlistElement = document.createElement('div');
    previousBirdlistElement.id = "birdlists-content";
    previousBirdlistElement.innerHTML = doc.body.innerHTML;
    contentElement.appendChild(previousBirdlistElement);

    // 3. Injecte les scripts
    doc.querySelectorAll("script").forEach(oldScript => {
      const newScript = document.createElement("script");

      for (const attr of oldScript.attributes) {
        newScript.setAttribute(attr.name, attr.value);
      }

      newScript.textContent = oldScript.textContent;
      document.body.appendChild(newScript);
    });
  }
}


export async function restorePreviousContent() {
  const contentElement = document.getElementById('content');

  // Supprime le birdlist injecté
  if (previousBirdlistElement) {
    previousBirdlistElement.remove();
    previousBirdlistElement = null;
  }

  // Restaure la visibilité du contenu original
  Array.from(contentElement.children).forEach(child => {
    child.style.display = '';
  });

  //todo: voir s'il faut lire un nouvel oiseau et reset le score (si on ne lit plus la même liste)
  resetBirds();

  //todo: check s'il faut cacher les types (dans le cas où on ne choisit pas la liste par défaut: les sélectionner tous et les cacher)
}



async function resetBirds() {
  const app = await getApp();
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
