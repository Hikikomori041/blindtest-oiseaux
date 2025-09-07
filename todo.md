# Notes de mise à jour 2.3.0
- Ajout des listes d'oiseaux !
  - Vous pouvez maintenant créer, modifier et charger des listes personnalisées d'oiseaux :D
  - Changement de pas mal de choses dans le fonctionnement du programme, j'espère que y aura pas de bugs, mais n'hésite pas à les signaler si c'est le cas :')
- Petites modifications:
  - La touche Ctrl permet de sélectionner rapidement la zone de recherche


# EN COURS
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)


# Oiseaux à ajouter / modifier

---
# À faire
- mettre une scrollbar sur l'écran de sélection des listes

---
# Bugs à fix
- Un peu osef: quand on fait enregistrer les modifications d'une liste alors que l'on n'a pourtant rien changé, cela recharge le blind-test

---
# À faire peut-être
- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière
- enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- section "notes de mise à jour" pour marquer la release
  -> pop-up au lancement après une maj pour afficher lesdîtes notes 🤔
- demander a gpt une page html pour comparer les images des oiseaux avec leurs images oiseaux.net (corriger les oiseaux mal mis)
- pour les notes de maj:
  - faire un changelog.txt
  - quand on supprime le fichier setup, on peut afficher les notes dans un pop-up



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