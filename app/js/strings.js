// Permet de récupérer le 'slug' de l'url oiseaux.net à partir du nom de l'oiseau
export function slugify(nomOiseau) {
  return nomOiseau.normalize('NFD')
    .replace("'", ".")
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ /g, '.')
    .replace(/[^a-z0-9.-]/g, '');
}


// Retourne les types d'oiseaux sélectionnés
export function getSelectedTypes() {
  return [...document.querySelectorAll('#type-selection .button.is-selected')]
    .map(btn => btn.dataset.type);
}


const birdNameCollator = new Intl.Collator(['fr-FR', 'fr'], {
  sensitivity: 'base',
  ignorePunctuation: true,
  numeric: true,
});

export function compareBirdNames(nameA, nameB) {
  return birdNameCollator.compare(nameA, nameB);
}

export function getSortedBirdNames(birdsData) {
  return Object.keys(birdsData).sort(compareBirdNames);
}

export function getSortedBirdEntries(birdsData) {
  return Object.entries(birdsData).sort(([nameA], [nameB]) => compareBirdNames(nameA, nameB));
}


export function getNomLatin(nomFrancais, birdsData) {
  return birdsData[nomFrancais]?.nom_latin || '';
}

export function log(message) {
  window.api.logMessage(message);
}