# Notes de mises à jour 2.2.6
- Ajouts de quelques oiseaux
- Ajout du bouton "plein écran"
- La barre de recherche reste maintenant pendant le scrolling
- Améliorations techniques

# Oiseaux à ajouter


---
# À faire
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)

---
# Bugs à fix
- #427: quand on a écouté 0 oiseau, et qu'on fait "écouter cet oiseau" alors qu'on a le démarrage auto désactivé, le son ne se lance pas avant d'appuyer sur play manuellement

---
# À faire peut-être
- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière (et de fix le bug #427)
- enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- section "notes de mise à jour" pour marquer la release
  -> pop-up au lancement après une maj pour afficher lesdîtes notes 🤔
- lorsque l'on fait "écouter cet oiseau", changer "quel est cet oiseau ?" en "on écoute: ..."
  -> ça, + le bug #427 -> différencier la lecture simple de la lecture choisie ? 🤔 genre on supprime la liste d'oiseaux et on la remplace par juste l'oiseau et un bouton "suivant" (on ne compte pas le point ni ne l'ajoutons au total d'oiseaux lus)

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