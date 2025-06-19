// Permet de récupérer le 'slug' de l'url oiseaux.net à partir du nom de l'oiseau
export function slugify(nomOiseau) {
  return nomOiseau.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/ /g, '.')
    .replace(/[^a-z0-9.-]/g, '');
}


