// Charger settings au démarrage
window.api.loadSettings().then((data) => {
  // console.log('Settings chargés:', data);
  volume = data.volume;
  // Mettre le slider volume à jour :
  volumeSlider.value = volume;
  updateVolumeGradient();

  // Appliquer les types sélectionnés :
  applySelectedTypes(data.selectedTypes);
});

// Avant de fermer l'app, sauvegarder :
window.addEventListener('beforeunload', (e) => {
  const dataToSave = {
    volume: volume,
    selectedTypes: getSelectedTypes()
  };
  window.api.saveSettings(dataToSave);
});
