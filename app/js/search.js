// Recherche un oiseau dans la liste affichée
export function searchBird(e) {
  const query = e.target.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const tokens = query.split(/\s+/).filter(Boolean);

  const matches = (name) => {
    if (!query) return true;
    // match plein texte classique
    if (name.includes(query)) return true;

    // match abréviations : "acc mou" => "accenteur mouchet"
    const words = name.split(/\s+/);
    let i = 0;
    for (const tok of tokens) {
      let ok = false;
      while (i < words.length) {
        if (words[i].includes(tok)) { ok = true; i++; break; }
        i++;
      }
      if (!ok) return false;
    }
    return true;
  };

  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    const name = cell.dataset.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (matches(name)) {
      cell.classList.remove('display-none');
    } else {
      cell.classList.add('display-none');
    }
  });
}



// Effacer la recheche
export function clearSearch() {
  document.getElementById('search-bar').value = '';
  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    cell.classList.remove('display-none');
  });
}
