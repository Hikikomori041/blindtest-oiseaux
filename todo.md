# Oiseaux à ajouter
- Fauvette grisette - plaine
- Grive draine - commun
- Bergeronnette des ruisseaux - commun
- Pie-grièche écorcheur - plaine
- Busard cendré - plaine
- Busard St Martin - plaine

---
# À faire
- regarder pour stuck la barre de recherche au scroll
- fonction "plein écran" (bouton à droite du volume)

---
# Bugs à fix

---
# À faire peut-être
- charger les sons de validation en avance ? (fonction playSuccessSound(success = true))
- oiseau cell: noms plus gros et case plus haute ?
- bouton autre son plus gros ?
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- regarder le padding du grosbec casse-noyaux (était sur 2 lignes quand survol si largeur d'une certaine taille)


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