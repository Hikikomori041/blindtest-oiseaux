// Permet de récupérer le 'slug' de l'url oiseaux.net à partir du nom de l'oiseau
export function slugify(nomOiseau) {
  return nomOiseau.normalize('NFD')
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
