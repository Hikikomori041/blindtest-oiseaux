// Recherche un oiseau dans la liste affichée
export function searchBird(e) {
  const query = e.target.value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    const name = cell.dataset.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (name.includes(query)) {
      cell.style.display = '';
    } else {
      cell.style.display = 'none';
    }
  });
}


// Effacer la recheche
export function clearSearch() {
  document.getElementById('search-bar').value = '';
  document.querySelectorAll('#bird-grid .cell').forEach(cell => {
    cell.style.display = '';
  });
}
