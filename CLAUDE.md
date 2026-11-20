# Blind-Test Oiseaux

Application Electron (Windows + Mac) de blind-test de cris et chants d'oiseaux. Code, commentaires et messages en français.

## Commandes

| Commande | Rôle |
| --- | --- |
| `npm start` | Lance l'appli en dev |
| `npm run lint` | ESLint (main, renderer, `scripts/`, `tools/`) |
| `npm run build` | Build local (electron-builder → `dist/`) |
| `npm run release` | Crée et pousse le tag `v<version>` → GitHub Actions build Win + Mac et publie la release (auto-update) |
| `npm run birds:check -- "Nom:cat" …` | Vérifie des oiseaux à ajouter (voir plus bas) |
| `npm run birds:collect` | Crée les dossiers du lot en cours + ouvre la page de collecte |
| `npm run birds:merge` | Fusionne le lot dans `birds.json` puis lance `birds:prepare` |
| `npm run birds:prepare` | Trie `birds.json`, renomme les images en `image.jpg`, réencode les sons en MP3 96k, régénère `birds-index.json` |
| `npm run birds:audit` | Contrôle tout le blind-test (liens oiseaux.net, noms latins, catégories, dossiers) |

`birds:prepare` lance des scripts Python via `scripts/run-python.js` (premier interpréteur trouvé parmi `py -3`, `python`, `python3`) et a besoin de `ffmpeg` (`winget install Gyan.FFmpeg`) et du module `mutagen` (`python -m pip install --user mutagen`).

## Architecture

```text
electron-main.js   Process principal : fenêtres (splash, principale, mise à jour), IPC, protocole res://,
                   synchro des données oiseaux, auto-update (electron-updater)
preload.js         Pont contextBridge → window.api (renderer) et window.updateApi (fenêtre de MAJ)
app/               Renderer (HTML/CSS + modules ES dans app/js/)
  js/main.js       Point d'entrée → init.js (loadApp)
  js/platform/     Tout ce qui dépend de la plateforme (index.js choisit l'implémentation, electron.js)
  js/settings.js   Paramètres utilisateur (valeurs par défaut + sauvegarde)
  js/layout.js     Affichage : grille d'oiseaux, popups, tuiles, validation
  js/controls*.js  Liaison des boutons / menus / raccourcis
  js/player.js     Lecture audio (oiseau aléatoire, variantes, volume, mode replay)
  js/birdlists.js  Listes personnalisées (stockées dans userData/my_lists/*.json)
  js/strings.js    Utilitaires : slugify (lien oiseaux.net), tri FR, types sélectionnés
assets/data/       birds.json (données) + birds-index.json (manifeste généré)
assets/images|sons Ressources de l'interface (pas les oiseaux)
birds/<Nom FR>/    Un dossier par oiseau : image.jpg + un ou plusieurs .mp3 (non inclus dans l'installeur)
scripts/           Préparation des fichiers oiseaux (appelés par npm run birds:prepare)
tools/             Outillage d'ajout d'oiseaux (tools/oiseaux.js + lot en cours tools/new_birds.json)
```

### Couche plateforme (renderer)

Le renderer doit tourner sur Electron et, à terme, sur Android (Capacitor, branche `mobile-android`). Dans `app/js/`, **ne jamais appeler directement** `window.api`, `res://` ni `window.open` : passer par `platform` (`app/js/platform/index.js`), par ex. `platform.resourceUrl('images/x.png')`, `platform.openLink(url)`, `platform.getAllLists()`. L'interface est décrite en tête de `platform/index.js`. Une nouvelle fonction native s'ajoute à `preload.js` + `electron-main.js` **et** à `platform/electron.js` (et à l'implémentation mobile quand elle existera). Les `res://` du HTML/CSS statique restent tels quels (ils seront réécrits par le build mobile).

### Données oiseaux

- `assets/data/birds.json` : `{ "Nom FR": { "type": "<catégorie>", "nom_latin": "…" } }`. Le nom FR est la clé, le nom du dossier dans `birds/` et la source du lien oiseaux.net.
- Catégories (`type`) : `commun`, `eau`, `foret`, `marin`, `montagne`, `nocturne`, `plaine`.
- **Le lien oiseaux.net n'est jamais stocké** : `https://www.oiseaux.net/oiseaux/${slugify(nom)}.html` (`app/js/strings.js`, recopié dans `tools/oiseaux.js`, à garder synchronisés). Le nom doit donc produire le bon slug : pas de ligature (`oe` et non `œ`).
- `assets/data/birds-index.json` : généré par `scripts/generate-birds-index.js` (chemin, taille, sha256 de chaque fichier de `birds/`). Ne pas l'éditer à la main.

### Distribution des oiseaux (important)

Les oiseaux ne sont **pas** dans l'installeur (`!birds/**`). Au démarrage, l'appli télécharge depuis la branche `main` sur GitHub :

1. `birds.json` (avec ETag) → cache `userData/assets/data/birds.json` ;
2. `birds-index.json`, puis chaque fichier de `birds/` manquant ou modifié (vérif. sha256) → `userData/assets/birds/`.

Le protocole `res://` résout d'abord le cache userData, puis les fichiers embarqués. Conséquence : **pousser sur `main` publie immédiatement les nouveaux oiseaux à tous les utilisateurs**, sans release. Un oiseau présent dans `birds.json` sans ses fichiers (ou sans `birds-index.json` régénéré) sera cassé chez tout le monde.

**Ne pas renommer un dossier d'oiseau en changeant seulement la casse** (ex. `Sterne Pierregarin` → `Sterne pierregarin`) : la synchro traite l'ancien chemin comme « à supprimer » et le nouveau comme « à télécharger », par oiseau, dans l'ordre `localeCompare`. Sur les systèmes de fichiers insensibles à la casse (Windows, Mac), la suppression peut effacer les fichiers fraîchement téléchargés → oiseau sans son jusqu'au lancement suivant. Renommer la clé dans `birds.json` casserait aussi les listes personnalisées qui la référencent.

## Ajouter des oiseaux

Tout tourne autour de `tools/new_birds.json` (même format que `birds.json`) qui contient le lot en cours. Le skill `/ajout-oiseaux` (`.claude/skills/ajout-oiseaux/`) automatise l'étape 1.

1. **Vérifier / ajouter au lot** : `node tools/oiseaux.js verifier "Nom[:categorie]" … [--type cat] [--ajouter]`
   Pour chaque nom : déjà présent ? (par nom ou nom latin) Sinon recherche sur oiseaux.net (correspondance exacte sans accents/casse, synonymes, nom latin ou anglais, puis suggestions) → orthographe officielle + nom latin. `--ajouter` écrit les nouveaux dans `tools/new_birds.json`.
2. **Collecte** : `npm run birds:collect` → crée `birds/<Nom>/` et génère `tools/collecte.html` (liens fiche oiseaux.net, sons xeno-canto, dossier, état image/sons).
3. **Ajout manuel** des fichiers : une image `.jpg` et des sons `.mp3`/`.wav` par dossier.
4. **Fusion** (déclenchée uniquement par l'utilisateur) : `npm run birds:merge` → refuse s'il manque une image ou des sons (`--partiel` pour ne fusionner que les oiseaux prêts), insère dans `birds.json`, vide le lot, puis `birds:prepare`.
5. Commit + push sur `main` (par l'utilisateur).

Détails de `tools/oiseaux.js` : la liste des espèces (pages France + Europe d'oiseaux.net, ~1100 espèces avec synonymes) est mise en cache 30 jours dans `tools/.cache/` (`--rafraichir` pour forcer). Elle ne sert qu'à **trouver** l'espèce : le nom et le latin écrits dans le lot sont toujours relus sur la fiche en ligne (et la liste est rechargée si la fiche a disparu). `audit` repart toujours d'une liste fraîche. `tools/collecte.html` et `tools/.cache/` sont générés et ignorés par git.

## Conventions

- **Ne jamais commiter ni pousser** : l'utilisateur s'en charge. Proposer seulement un message de commit.
- Noms d'oiseaux : majuscule au premier mot et aux noms propres uniquement (« Grand tétras », « Bernache du Canada »).
- Fins de ligne : `core.autocrlf=true`, le dépôt stocke du LF.
- `todo.md` : notes de l'utilisateur (idées, bugs, oiseaux prévus).
- CI (`.github/workflows/ci.yml`) : lint + audit + build Windows, ignorée pour les changements de données, `scripts/`, `tools/` et docs. Build de release : `build.yml` sur tag `v*`.
