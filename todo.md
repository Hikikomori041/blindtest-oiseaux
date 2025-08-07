# Notes de mises à jour 2.2.7
- "Écouter cet oiseau" affiche maintenant un écran différent
- Agrandissement des boutons: ━ , 🗖 et ✖
- Correction de bugs

# Oiseaux à ajouter


---
# À faire
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)

---
# Bugs à fix
- quand on fait retour depuis "mes listes" 2 fois de suite, ça marche pas :/

---
# À faire peut-être
- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière (et de fix le bug #427)
- enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- section "notes de mise à jour" pour marquer la release
  -> pop-up au lancement après une maj pour afficher lesdîtes notes 🤔
- demander a gpt une page html pour comparer les images des oiseaux avec leurs images oiseaux.net (corriger les oiseaux mal mis)


# Idées abandonnées
- ajouter la langue anglaise ? (un peu long pour pas grand chose d'utile, mais possible à faire)

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