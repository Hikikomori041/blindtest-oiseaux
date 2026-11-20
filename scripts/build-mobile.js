// Prépare www/ (webDir de Capacitor) à partir du renderer desktop :
//   app/index.html, app/css, app/js     → www/ (+ css/mobile.css, chargée seulement ici)
//   assets/images, assets/sons          → www/images, www/sons
//   assets/data/birds.json              → www/data/birds.json (secours au 1er lancement hors ligne)
//   @capacitor/core, bulma              → www/js/platform/vendor, www/css/vendor
// puis remplace ce qui est propre à Electron dans le HTML/CSS statique (res://, CDN, CSP).
// Les oiseaux (birds/) ne sont pas embarqués : l'appli les télécharge depuis GitHub.
//
// Usage : node scripts/build-mobile.js   (appelé par npm run mobile:build)

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WWW = path.join(ROOT, 'www');

const CSP = [
  "default-src 'self'",
  // 'unsafe-inline' : Capacitor peut injecter son pont natif en script inline sur les anciennes WebView
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://raw.githubusercontent.com",
  "media-src 'self' data: https://raw.githubusercontent.com",
  "connect-src 'self' https://raw.githubusercontent.com",
].join('; ');

function copy(from, to) {
  fs.cpSync(path.join(ROOT, from), path.join(WWW, to), { recursive: true });
}

// Remplace chaque motif (qui doit être présent) dans un fichier de www/
function rewrite(relativePath, replacements) {
  const filePath = path.join(WWW, relativePath);
  let content = fs.readFileSync(filePath, 'utf8');
  for (const [pattern, replacement] of replacements) {
    if (!pattern.test(content)) {
      throw new Error(`Motif ${pattern} introuvable dans ${relativePath}`);
    }
    content = content.replace(pattern, replacement);
  }
  fs.writeFileSync(filePath, content);
}

fs.rmSync(WWW, { recursive: true, force: true });
fs.mkdirSync(WWW);

copy('app/index.html', 'index.html');
copy('app/css', 'css');
copy('app/js', 'js');
copy('assets/images', 'images');
copy('assets/sons', 'sons');
copy('assets/data/birds.json', 'data/birds.json');
copy('node_modules/@capacitor/core/dist/index.js', 'js/platform/vendor/capacitor-core.js');
copy('node_modules/bulma/css/bulma.min.css', 'css/vendor/bulma.min.css');

rewrite('index.html', [
  [/(<meta http-equiv="Content-Security-Policy" content=")[^"]*(")/, `$1${CSP}$2`],
  [/https:\/\/cdn\.jsdelivr\.net\/npm\/bulma@[^"]*\/bulma\.min\.css/, 'css/vendor/bulma.min.css'],
  [/res:\/\/images\//g, 'images/'],
  // Largeur de l'écran, sans zoom (le zoom à deux doigts gênerait le jeu)
  [/(<meta charset="UTF-8">)/, '$1\n  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">'],
  // Feuille de style mobile, après les autres pour les surcharger
  [/(\s*<\/head>)/, '\n  <link rel="stylesheet" href="css/mobile.css">$1'],
]);

for (const cssFile of fs.readdirSync(path.join(WWW, 'css'))) {
  if (!cssFile.endsWith('.css')) continue;
  const filePath = path.join(WWW, 'css', cssFile);
  const content = fs.readFileSync(filePath, 'utf8');
  fs.writeFileSync(filePath, content.replace(/res:\/\/images\//g, '../images/'));
}

// Il ne doit plus rester de res:// dans le HTML/CSS (le JS passe par platform.resourceUrl)
for (const file of ['index.html', ...fs.readdirSync(path.join(WWW, 'css')).map(f => `css/${f}`)]) {
  const fullPath = path.join(WWW, file);
  if (fs.statSync(fullPath).isFile() && fs.readFileSync(fullPath, 'utf8').includes('res://')) {
    throw new Error(`res:// restant dans www/${file}`);
  }
}

console.log('✅ www/ prêt pour Capacitor');
