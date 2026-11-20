import { loadApp } from "./init.js";

// platform/index.js utilise un await de premier niveau (chargement de capacitor.js sur mobile) :
// ce module peut donc s'exécuter après DOMContentLoaded, d'où le test sur readyState.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => loadApp());
} else {
  loadApp();
}
