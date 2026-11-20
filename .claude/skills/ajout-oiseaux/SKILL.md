---
name: ajout-oiseaux
description: Prépare l'ajout de nouveaux oiseaux au blind-test à partir d'une simple liste de noms (avec ou sans catégories) — vérifie s'ils existent déjà, corrige l'orthographe d'après oiseaux.net, trouve les noms latins, remplit tools/new_birds.json et crée les dossiers + la page de collecte. À utiliser dès que l'utilisateur donne des noms d'oiseaux à ajouter ou demande si des oiseaux sont déjà dans le blind-test.
---

# Ajout d'oiseaux au blind-test

L'utilisateur donne des noms d'oiseaux (souvent approximatifs : sans accents, fautes, noms usuels comme « chouette effraie »), éventuellement avec des catégories. Ton rôle : l'étape 1 du processus décrit dans `CLAUDE.md` (section « Ajouter des oiseaux »), jusqu'à la création des dossiers. **Tu ne lances jamais la fusion** (`fusion` / `npm run birds:merge`) : l'utilisateur la déclenche lui-même quand il a ajouté images et sons.

Catégories valides : `commun`, `eau`, `foret`, `marin`, `montagne`, `nocturne`, `plaine`.

## Étapes

1. **Vérifier** tous les noms d'un coup (rapide, la liste des espèces oiseaux.net est en cache) :
   ```
   node tools/oiseaux.js verifier "Nom 1:categorie" "Nom 2" ... [--type <categorie>]
   ```
   `--type` s'applique aux noms sans `:categorie`. Statuts possibles :
   - `= DÉJÀ PRÉSENT` : dans le blind-test ou dans le lot en cours (détecté aussi par nom latin, donc les synonymes sont attrapés). Le signaler, ne rien faire.
   - `+ NOUVEAU` : trouvé sur oiseaux.net, nom et latin fiables.
   - `! CATÉGORIE ?` : trouvé, mais sans catégorie → en proposer une (voir plus bas).
   - `? À PRÉCISER` : pas de correspondance exacte, des suggestions sont listées. Si une suggestion est évidente (faute de frappe, nom usuel), la retenir en le disant ; si elle est marquée « déjà présent », l'oiseau est en fait déjà dans le blind-test. Sinon demander.
   - `✗ INTROUVABLE` : chercher toi-même le nom français officiel (WebSearch si besoin) et relancer `verifier` avec ce nom. Un oiseau n'est ajouté que si sa fiche oiseaux.net existe.

2. **Choisir les catégories manquantes** : t'inspirer du classement existant dans `assets/data/birds.json` (espèces proches, même famille, habitat principal en France). Les rapaces nocturnes vont en `nocturne`, les limicoles/laridés côtiers plutôt en `marin`, les oiseaux des jardins/villes en `commun`.

3. **Présenter un récapitulatif** court à l'utilisateur : déjà présents, nouveaux (nom → latin → catégorie), et ce que tu as deviné (orthographe corrigée, catégorie proposée, suggestion retenue).
   - Si tout vient de l'utilisateur sans ambiguïté (noms exacts, catégories données), passe directement à l'étape 4.
   - Sinon, demande une confirmation unique avant d'écrire.

4. **Écrire le lot** en relançant avec les noms définitifs :
   ```
   node tools/oiseaux.js verifier "Nom exact:categorie" ... --ajouter
   ```
   Convention de nommage du projet : majuscule uniquement au premier mot et aux noms propres (« Grand tétras », « Bernache du Canada »). oiseaux.net met parfois des majuscules ailleurs (« Grand Tétras ») : si la saisie ne diffère que par la casse, l'outil garde la saisie, donc passe le nom avec la bonne casse. Le nom ne doit pas contenir de ligature (« oe » et non « œ ») — l'outil s'en charge.

5. **Préparer la collecte** :
   ```
   npm run birds:collect
   ```
   Crée `birds/<Nom>/` pour chaque oiseau du lot et ouvre `tools/collecte.html` (liens fiche oiseaux.net + sons xeno-canto + dossier, état image/sons).

6. **Conclure** en rappelant la suite à l'utilisateur : déposer une image `.jpg` et des sons `.mp3`/`.wav` dans chaque dossier, relancer `npm run birds:collect` pour voir l'avancement, puis `npm run birds:merge` quand tout est prêt.

## À ne pas faire

- Ne pas éditer `assets/data/birds.json` à la main ni lancer `fusion` / `birds:merge`.
- Ne pas stocker de lien oiseaux.net : il se déduit du nom via `slugify()` (`app/js/strings.js`).
- Ne pas ajouter un oiseau dont la fiche oiseaux.net n'existe pas sous le nom choisi (l'outil affiche un avertissement `ATTENTION le lien généré…` dans ce cas).
