# Oiseaux à ajouter

---
# À faire
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)

---
# Bugs à fix
- quand on a écouté 0 oiseau, et qu'on fait "écouter cet oiseau" alors qu'on a le démarrage auto désactivé, le son ne se lance pas avant d'appuyer sur play manuellement

---
# À faire peut-être
- oiseau cell: noms plus gros et case plus haute ?
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