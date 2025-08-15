# Notes de mise à jour 2.2.8
- Petites modifications:
  - La touche Ctrl permet d'écrire rapidement dans la barre de recherche



# EN COURS
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)


# Oiseaux à ajouter / modifier

---
# À faire
- mettre une scrollbar sur l'écran de sélection des listes

---
# Bugs à fix
- quand on retourne de mes listes apres avoir fait ecouter ce piaf (sera corrigé quand on chargera la nouvelle grid et l'oiseau lu)

---
# À faire peut-être
- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière
- enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- section "notes de mise à jour" pour marquer la release
  -> pop-up au lancement après une maj pour afficher lesdîtes notes 🤔
- demander a gpt une page html pour comparer les images des oiseaux avec leurs images oiseaux.net (corriger les oiseaux mal mis)



# Idées abandonnées
- ajouter la langue anglaise ? (un peu long pour pas grand chose d'utile, mais techniquement possible à faire)

---
---
## Aide
Pour installer:
```cmd
npm install
```
Pour lancer:
```cmd
npm start
```
Pour build en local:
```cmd
npm run build
```
Pour push une release, on peut simplement faire:
```cmd
npm run release
```
---
## Notes pour package.json:

- Ce code permet apparemment d'enregistrer à part le dossier ressources (cela dit le programme ne charge plus rien après)
```json
    "files": [
      "**/*",
      "!ressources/**/*"
    ],
    "extraFiles": [
      {
        "from": "ressources",
        "to": "ressources"
      }
    ]
```