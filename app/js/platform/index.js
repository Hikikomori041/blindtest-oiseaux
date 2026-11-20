// Point d'accès unique aux fonctions qui dépendent de la plateforme (Electron, Android…).
// Le reste du renderer ne doit jamais appeler window.api, res:// ou window.open directement :
// il passe par `platform`, pour que le même code tourne sur desktop et sur mobile.
//
// Interface commune (voir electron.js pour le détail) :
//   name, isDesktop
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

export const platform = electronPlatform;
