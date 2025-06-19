export async function loadSettings() {
  const settings = await window.api.loadSettings();
  return settings;
}

export async function saveSettings(data) {
  await window.api.saveSettings(data);
}
