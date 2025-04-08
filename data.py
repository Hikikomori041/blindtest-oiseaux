import os
import sys

def resource_path(relative_path):
    try:
        base_path = os.path.join(sys._MEIPASS, "ressources")
    except Exception:
        base_path = os.path.abspath("ressources")
    return os.path.join(base_path, relative_path)

selected_category = "de plaine"
base_dossier = None
sons = []
noms_oiseaux = []
sons_par_oiseau = {}
success_sound = None
failure_sound = None
icon_path = None

def set_category(category):
    global selected_category, base_dossier
    selected_category = category
    base_dossier = resource_path(os.path.join("oiseaux", selected_category))

def load_data():
    global sons, noms_oiseaux, sons_par_oiseau, success_sound, failure_sound, icon_path
    success_sound = resource_path("sons/succes.mp3")
    failure_sound = resource_path("sons/erreur.mp3")
    icon_path = resource_path("images/oiseau.ico")

    sons = []
    noms_oiseaux = []
    sons_par_oiseau = {}

    for nom in os.listdir(base_dossier):
        chemin = os.path.join(base_dossier, nom)
        if os.path.isdir(chemin):
            fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
            sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
            for fichier in fichiers:
                sons.append((nom, os.path.join(chemin, fichier)))
            noms_oiseaux.append(nom)
