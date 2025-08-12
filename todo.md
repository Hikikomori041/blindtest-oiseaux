# Notes de mises à jour 2.2.7
- Ajout d'une option pour changer la taille des oiseaux affichés
- Maintenant, "Écouter cet oiseau" affiche un écran différent et permet de relire l'oiseau précédent pour continuer le Blind-Test
- Petits changements:
  - La recherche des oiseaux a été améliorée
  - Dans la barre de recherche, la touche Entrée valide le premier oiseau affiché, la touche Échap unfocus la zone
  - Appuyer sur flèche haut ou flèche bas pour changer le volume affiche la tooltip brievement
  - Au survol d'un oiseau avec la souris, appuyer sur la touche Entrée valide cet oiseau
  - Agrandissement des boutons: ━ , 🗖 et ✖ de la fenêtre

- Oiseaux:
  - Changements des images de la Grande Aigrette et du Pic vert pour qu'ils soient plus reconnaissables
  - Changements des sons de la Bouscarle de Cetti et de la Fauvette grisette

- Correction de bugs


# EN COURS
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)


# Oiseaux à ajouter / modifier

---
# À faire

---
# Bugs à fix
- quand on retourne de mes listes apres avoir fait ecouter ce piaf (sera corrigé quand on rechargera la grid et l'oiseau lu)

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