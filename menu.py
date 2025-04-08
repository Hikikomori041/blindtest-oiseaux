import os
import tkinter as tk
from functools import partial
import subprocess
import sys
import ctypes

# Pour compatibilité PyInstaller : récupérer chemin d'exécution
def resource_path(relative_path):
    try:
        base_path = os.path.join(sys._MEIPASS, "ressources")
    except Exception:
        base_path = os.path.abspath("ressources")
    return os.path.join(base_path, relative_path)

# Fonction pour centrer la fenêtre à l'écran
def center_window(window, width=400, height=400):
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    x = int((screen_width / 2) - (width / 2))
    y = int((screen_height / 2) - (height / 2))
    window.geometry(f"{width}x{height}+{x}+{y}")


def launch_blindtest(category):
    # subprocess.Popen([sys.executable, "Blind-Test Oiseaux.py", category])
    subprocess.Popen(["python", "BlindTest.py", category])
    # subprocess.Popen(["Blind-Test Oiseaux.exe", category])


    root.destroy()

icon_path = resource_path("images/oiseau.ico")

if sys.platform == "win32":
    ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("BlindTestOiseaux")

root = tk.Tk()
root.iconbitmap(icon_path)
root.title("Menu Blind-Test Oiseaux")
root.geometry("400x400")
root.option_add("*Font", "Impact 16")
center_window(root)

label = tk.Label(root, text="Choisis ton épreuve de chant, oisillon !", pady=20)
label.pack()

button_frame = tk.Frame(root)
button_frame.pack(pady=20)

boutons = [
    ("🟢 Oiseaux des Plaines", "de plaine"),
    ("🟡 Oiseaux Communs", "communs"),
    ("🌈 Tous les Oiseaux", "")
]

for text, cat in boutons:
    btn = tk.Button(button_frame, text=text, width=30, height=2, command=partial(launch_blindtest, cat))
    btn.pack(pady=10)

root.mainloop()