import os
import json
import locale
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")

try:
    locale.setlocale(locale.LC_COLLATE, 'fr_FR.UTF-8')
except locale.Error:
    try:
        locale.setlocale(locale.LC_COLLATE, 'fr_FR')
    except locale.Error:
        # Fallback: keep system default collation if French locale is unavailable.
        pass


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

print("JSON sorted successfully")
