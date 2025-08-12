# Notes de mises à jour 2.2.7
- "Écouter cet oiseau" affiche maintenant un écran différent
- Petits changements:
  - Agrandissement des boutons: ━ , 🗖 et ✖
  - Appuyer sur flèche haut ou flèche bas pour changer le volume affiche la tooltip brievement
  - Dans la barre de recherche, la touche Entrée valide le premier oiseau affiché, la touche Échap unfocus la zone
  - La recherche des oiseaux a été améliorée
  - Au survol d'un oiseau, appuyer sur la touche Entrée valide cet oiseau

- Correction de bugs


# EN COURS
- mettre un truc taille cell oiseau petit normal grand
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)


# Oiseaux à ajouter / modifier
- grande aigrette: mettre une image avec un bec jaune car plus reconnaissable
- modifier le chant de la bouscarle de cetti et de la fauvette grisette
- pic vert : changer image pour le ;ettre au sol pcq le pic ne tape pas contre les arbres

---
# À faire
- dans "écouter cet oiseau", faire revenir a l'oiseau precedent pas nouveau oiseau

---
# Bugs à fix
- quand on retourne de mes listes apres avoir fait ecouter ce piaf

---
# À faire peut-être
- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière
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