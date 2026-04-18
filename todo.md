# To do

## Notes de mise à jour 2.4.2

- Ajout des catégories "oiseaux marins" et "oiseaux nocturne"
- Refonte de l'interface de sélection de catégories

## Oiseaux à ajouter / modifier

- Oiseaux nocturnes:
  - Chouette hulotte
  - Effraies des clochers
  - Chevêche d'Athéna
  - Hibou grand duc
   - Hibou petit-duc --> Petit-duc scops? demander à Manou
  --> des cris et des chants

- Oiseaux forestier
  - Épervier d'europe
  - Autour des palombes

- Oiseaux d'eau
  - Échasse blanche
  - Gorgebleue à miroir

- Oiseaux marins
  - Mouette mélanocéphale
  - Goéland argenté
  - Goéland marin
  - Goéland leucophée
  - Goéland brun
  - Sterne Pierregarin
  - Sterne naine
  - Sterne gaujek
  - Sterne de Dougall
  - Guifette moustac
  - Labbre parasite
  - Plongeon imbrin
  - Plongeon du pacifique
  - Guifette noire
  - Guifette leucoptère
  - huîtrier pie
  - Tournepierre à collier
  - Grand gravelot
  - Petit gravelot

Et tu peux même mettre la mouette rieuse (qui est en commun") dedans


## À faire

## Bugs à fix

- Un peu osef: quand on fait enregistrer les modifications d'une liste alors que l'on n'a pourtant rien changé, cela recharge le blind-test

## À faire peut-être

- enregistrer en local la liste des oiseaux lus, afin de revenir en arrière
- enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)
- section "notes de mise à jour" pour marquer la release
  -> pop-up au lancement après une maj pour afficher lesdîtes notes 🤔
- demander a gpt une page html pour comparer les images des oiseaux avec leurs images oiseaux.net (corriger les oiseaux mal mis)
- pour les notes de maj:
  - faire un changelog.txt
  - quand on supprime le fichier setup, on peut afficher les notes dans un pop-up
- système de liste persos
  -> enregistrer le playCount à la fermeture de l'app -> ne faire ça que pour les listes persos (ou pour chaque liste ?)

## Idées abandonnées

- ajouter la langue anglaise ? (un peu long pour pas grand chose d'utile, mais techniquement possible à faire)

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
