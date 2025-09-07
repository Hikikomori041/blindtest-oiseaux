export async function loadSettings() {
  const settings = await window.api.loadSettings();
  return settings;
}

export async function saveSettings(data) {
  await window.api.saveSettings(data);
  // console.log(data);
}


export async function windowSetSize(width, height) {
  window.resizeTo(width, height);
}

