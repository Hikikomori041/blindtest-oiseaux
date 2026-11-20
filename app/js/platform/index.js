// Point d'accès unique aux fonctions qui dépendent de la plateforme (Electron, Android…).
// Le reste du renderer ne doit jamais appeler window.api, res:// ou window.open directement :
// il passe par `platform`, pour que le même code tourne sur desktop et sur mobile.
//
// Interface commune (voir electron.js et capacitor.js pour le détail) :
//   name, isDesktop
//   init()                        à attendre avant tout le reste (synchro des oiseaux sur mobile)
//   resourceUrl(chemin), loadBirdsData(), getSoundUrls(nomOiseau)
//   openLink(url)
//   getVersion(), getRemoteVersion()
//   loadSettings(), saveSettings(data)
//   getAllLists(), saveList(id, liste), deleteList(id)
//   closeWindow(), minimizeWindow(), toggleMaximizeWindow(), onMaximizeChange(cb),
//   resizeWindow(l, h), toggleFullscreen()
//   updateMediaState(isPaused, isMuted), onMediaControl(cb)
//   log(message)

import { electronPlatform } from './electron.js';

// Electron expose window.api (preload.js) ; l'appli Android expose window.Capacitor.
// capacitor.js n'est chargé que sur mobile (il dépend de fichiers copiés au build mobile).
const isCapacitor = !window.api && typeof window.Capacitor !== 'undefined';

export const platform = isCapacitor
  ? (await import('./capacitor.js')).capacitorPlatform
  : electronPlatform;
