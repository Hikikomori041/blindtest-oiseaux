import os
import json
import locale
locale.setlocale(locale.LC_COLLATE, 'fr_FR.UTF-8')


# Chemin absolu vers le JSON
racine = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
chemin_json = os.path.join(racine, "assets", "data", "birds.json")

# Charge le fichier
with open(chemin_json, "r", encoding="utf-8") as f:
    data = json.load(f)

# Trie par ordre alphabétique
# data_trie = dict(sorted(data.items()))
data_trie = dict(sorted(data.items(), key=lambda x: locale.strxfrm(x[0])))


# Écrit le fichier trié
with open(chemin_json, "w", encoding="utf-8") as f:
    json.dump(data_trie, f, ensure_ascii=False, indent=2)

print("JSON trié avec amour 🪶")
