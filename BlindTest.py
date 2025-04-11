import os
# Désactive le message d'accueil de pygame
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import pygame

import ctypes
import json
import random
import sys
import tkinter as tk
import webbrowser

from PIL import Image, ImageTk

WIDTH  = 700
HEIGHT = 780

PAUSE_ON_VALIDATE = False

# Fonction pour centrer la fenêtre à l'écran
def center_window(window, width=WIDTH, height=HEIGHT):
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    x = int((screen_width / 2) - (width / 2))
    y = int((screen_height / 2) - (height / 2))
    window.geometry(f"{width}x{height}+{x}+{y}")

# Pour compatibilité PyInstaller : récupérer chemin d'exécution
def resource_path(relative_path):
    base_path = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.abspath(".")
    return os.path.join(base_path, "ressources", relative_path)

base_dossier  = resource_path("oiseaux/")
icon_path     = resource_path("images/oiseau.ico")
success_sound = resource_path("sons/succes.mp3")
failure_sound = resource_path("sons/erreur.mp3")

types_oiseaux = ["Tous", "Communs", "De plaine", "D'eau"]
tooltip       = None

sons          = []
noms_oiseaux  = []
sons_par_oiseau = {}

# Chemin des ressources
json_path = os.path.join(resource_path("data"), "oiseaux.json")
with open(json_path, encoding="utf-8") as f:
    donnees_oiseaux = json.load(f)

for nom, infos in donnees_oiseaux.items():
    chemin = os.path.join(base_dossier, nom)
    fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
    sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
    for fichier in fichiers:
        sons.append((nom, os.path.join(chemin, fichier)))
    noms_oiseaux.append(nom)

noms_oiseaux.sort()

class Tooltip:
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip_window = None
        widget.bind("<Enter>", self.show)
        widget.bind("<Leave>", self.hide)

    def show(self, event=None):
        if self.tip_window or not self.text:
            return
        x, y, _, cy = self.widget.bbox("insert")
        x += self.widget.winfo_rootx() + 25
        y += self.widget.winfo_rooty() + 20
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.geometry(f"+{x}+{y}")
        label = tk.Label(tw, text=self.text, background="#ffffe0", relief="solid", borderwidth=1, font=("Berlin Sans FB", 13))
        label.pack()

    def hide(self, event=None):
        if self.tip_window:
            self.tip_window.destroy()
            self.tip_window = None

class BlindTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blind-Test Oiseaux")
        center_window(self.root)
        self.root.geometry(str(HEIGHT) + "x" + str(WIDTH))
        self.root.option_add("*Font", "{Berlin Sans FB} 14")
        self.current_sound_path = None
        self.current_answer  = None
        self.previous_answer = None
        self.playing = False
        self.paused  = False
        self.duration = 1
        self.animation_index = 0
        self.current_sound_index = 0
        self.score = 0
        self.total = 0
        self.emoji_sequence = ["🕊️", "🐦     ", "🐤     ", "🦜     "]
        self.type_actuel = types_oiseaux[0]

        # self.root.wm_attributes('-transparentcolor','#222222')
        # self.root.wm_attributes('-transparentcolor', root['bg'])
        
        # Fond d'écran
        self.background_image = None
        self.background_label = tk.Label(root)
        self.background_label.place(x=0, y=0, relwidth=1, relheight=1)

        image_path = os.path.join(resource_path("images"), "default.png")
        if os.path.exists(image_path):
            self.background_image = tk.PhotoImage(file=image_path)
            self.background_label.config(image=self.background_image)
            self.background_label.lower()

        # Choix du type d'oiseaux
        type = tk.Frame(root)
        type.pack()
        type.place(x=5, y=5)
        self.type_label = tk.Label(type, text="Type d'oiseaux:").pack(side=tk.LEFT, padx=1, pady=1)
        self.choix_type = tk.StringVar(type)
        self.choix_type.set(types_oiseaux[0])  # Valeur par défaut

        self.liste_type = tk.OptionMenu(type, self.choix_type, *types_oiseaux, command=self.change_type)
        menu1 = self.liste_type["menu"]
        menu1.config(
            font=("Berlin Sans FB Demi", 12),
            bg="#777777",
            fg="white",
            cursor="hand2"
        )
        self.liste_type.config(
            font=("Berlin Sans FB Demi", 12),
            bg="#cccccc",
            fg="black",
            cursor="hand2"
        )
        self.liste_type.pack()

        # Score
        self.score_label = tk.Label(root, fg="blue")
        self.score_label.pack()
        # self.score_label.place(x=5, y=50)

        # État du son
        self.emoji_label = tk.Label(root)
        self.emoji_label.pack(pady=4)
        # self.emoji_label.place(x=340, y=5)

        # Contrôles son 🎵
        controls = tk.Frame(root)
        controls.pack(ipady=2)
        
        self.replay_button = tk.Button(controls, text="⏮️", command=self.replay, bg="#2196F3", fg="white", cursor="hand2")
        self.replay_button.pack(side=tk.LEFT, padx=5)
        
        self.rewind_button = tk.Button(controls, text="⏪", command=self.rewind, bg="#A196F3", fg="white", cursor="hand2")
        self.rewind_button.pack(side=tk.LEFT, padx=5)
        
        self.pause_button  = tk.Button(controls, text="⏸️", command=self.toggle_pause, width=14, height=2, bg="#f44336", fg="white", relief="raised", bd=2, highlightbackground="#f44336", highlightthickness=1, cursor="hand2")
        self.pause_button.pack(side=tk.LEFT, padx=5, pady=5)
        
        self.fast_forward_button = tk.Button(controls, text="⏩", command=self.fast_forward, bg="#A196F3", fg="white", cursor="hand2")
        self.fast_forward_button.pack(side=tk.LEFT, padx=5)

        self.switch_button = tk.Button(controls, text="⏭️", command=self.next_sound_variant, bg="#219503", fg="white", cursor="hand2")
        self.switch_button.pack(side=tk.LEFT, padx=5)

        Tooltip(self.replay_button,       "Réécouter")
        Tooltip(self.rewind_button,       "Reculer")
        # self.pause_tooltip = Tooltip(self.pause_button, "Pause")
        Tooltip(self.fast_forward_button, "Avancer")
        Tooltip(self.switch_button,       "Autre son de cet oiseau")


        # Liste des réponses
        choice = tk.Frame(root)
        choice.pack()

        tk.Label(choice, text='Choisir un oiseau', bg='#aaa').pack(fill='x')

        self.liste_reponse = tk.Listbox(choice, width=40, cursor="hand2")
        self.liste_reponse.pack(side=tk.LEFT)
        self.liste_reponse.insert('end', *noms_oiseaux)
        self.liste_reponse.select_set(0)

        # Bouton valider
        self.validate_button = tk.Button(choice, text="✅ Valider", command=self.validate, width=25, height=2, bg="#FF9800", fg="white", cursor="hand2")
        self.validate_button.pack(pady=20)
        self.validate_button["state"] = "disabled"
        
        # Bouton son suivant
        self.next_button = tk.Button(choice, text="🔀 Oiseau suivant", command=self.play_random_sound, width=28, height=2, bg="#3F51B5", fg="white", cursor="hand2")
        self.next_button.pack(padx=5)
        self.next_button["state"] = "disabled"

        # Résultat
        self.result = tk.Label(root, font=("Helvetica", 14, "bold"))
        self.result.pack(pady=5)        

        # Image
        self.image_label = tk.Label(root)
        self.image_label.pack(pady=10)

        self.animate_emoji()
        self.check_sound_end()

    def animate_emoji(self):
        if self.playing and not self.paused:
            emoji = self.emoji_sequence[self.animation_index % len(self.emoji_sequence)]
            self.emoji_label.config(text=emoji + " 🎶")
            self.animation_index += 1
        self.root.after(300, self.animate_emoji)

    def animate_image_zoom(self):
        if self.zoom_step <= 10:
            size = int(50 + self.zoom_step * 20)
            img = self.original_image.resize((size, size))
            photo = ImageTk.PhotoImage(img)
            self.image_label.config(image=photo)
            self.image_label.image = photo
            self.zoom_step += 3
            self.root.after(40, self.animate_image_zoom)

    def change_type(self, type_choisi):
        if type_choisi != self.type_actuel:
            self.type_actuel = type_choisi

            global sons, noms_oiseaux, sons_par_oiseau
            sons = []
            noms_oiseaux = []
            sons_par_oiseau = {}

            type_filtre = "plaine" if type_choisi == "De plaine" else "commun" if type_choisi == "Communs" else "eau" if  type_choisi == "D'eau" else None
            image_name = "plaine.png" if type_choisi == "De plaine" else "communs.png" if type_choisi == "Communs" else "eau.png" if type_choisi == "D'eau"  else "default.png"
            image_path = os.path.join(resource_path("images"), image_name)

            for nom, infos in donnees_oiseaux.items():
                if type_filtre is None or infos["type"] == type_filtre:
                    chemin = os.path.join(base_dossier, nom)
                    fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
                    sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
                    for fichier in fichiers:
                        sons.append((nom, os.path.join(chemin, fichier)))
                    noms_oiseaux.append(nom)
            noms_oiseaux.sort()

            # Mettre à jour le fond d'écran
            if os.path.exists(image_path):
                self.background_image = tk.PhotoImage(file=image_path)
                self.background_label.config(image=self.background_image)
                self.background_label.lower()

            # Mise à jour des options de réponses
            if noms_oiseaux:
                self.liste_reponse.delete(0, tk.END)
                self.liste_reponse.insert('end', *noms_oiseaux)
                self.liste_reponse.select_set(0)

            self.play_random_sound()

    def check_sound_end(self):
        if self.playing and not self.paused:
            if not pygame.mixer.music.get_busy():
                self.playing = False
                self.emoji_label.config(text="Son terminé")
        self.root.after(500, self.check_sound_end)
        
    def fast_forward(self):
        if self.playing:
            pos = pygame.mixer.music.get_pos() / 1000
            new_pos = pos + 5
            pygame.mixer.music.stop()
            pygame.mixer.music.play(start=new_pos)

    def next_sound_variant(self):
        if self.current_answer and self.current_answer in sons_par_oiseau:
            variants = sons_par_oiseau[self.current_answer]
            if len(variants) > 1:
                self.current_sound_index = (self.current_sound_index + 1) % len(variants)
                self.current_sound_path = variants[self.current_sound_index]
                self.play_sound()

    def play_feedback_sound(self, success):
        sound_path = success_sound if success else failure_sound
        sound = pygame.mixer.Sound(sound_path)
        if success:
            sound.set_volume(0.1)  # Volume entre 0.0 (silence) et 1.0 (max)
        else:
            sound.set_volume(0.05)
        sound.play()

    def play_random_sound(self):
        self.stop()
        possible_sounds = [s for s in sons if s[0] != self.previous_answer] if self.previous_answer else sons
        nom, path = random.choice(possible_sounds)
        self.current_answer = nom
        self.previous_answer = nom
        self.current_sound_index = sons_par_oiseau[nom].index(path)
        self.current_sound_path = path
        self.play_sound()

    def play_sound(self):
        pygame.mixer.music.load(self.current_sound_path)
        pygame.mixer.music.play()
        self.result.config(text="")
        # self.choix_reponse.set(self.choix_reponse.get())
        
        self.validate_button["state"] = "normal"
        self.liste_reponse["state"]   = "normal"
        self.next_button["state"]     = "disabled"
        self.image_label.config(image="")
        self.image_label.image = None
        self.playing = True
        self.paused = False
        self.pause_button.config(text="⏸️", bg="#f44336")

    def replay(self):
        if self.current_sound_path:
            pygame.mixer.music.load(self.current_sound_path)
            pygame.mixer.music.play()
            self.playing = True
            self.paused = False
            self.pause_button.config(text="⏸️", bg="#f44336")

    def rewind(self):
        if self.playing:
            pos = pygame.mixer.music.get_pos() / 1000  # en secondes
            new_pos = max(0, pos - 5)
            pygame.mixer.music.stop()
            pygame.mixer.music.play(start=new_pos)

    def show_image(self):
        image_path = os.path.join(base_dossier, self.current_answer, "image.jpg")
        if os.path.exists(image_path):
            self.original_image = Image.open(image_path)
            self.zoom_step = 0
            self.animate_image_zoom()

            lien = donnees_oiseaux.get(self.current_answer, {}).get("lien")
            if lien:
                self.image_label.config(cursor="hand2")
                self.image_label.unbind("<Button-1>")
                self.image_label.bind("<Button-1>", lambda e: webbrowser.open(lien))
            else:
                self.image_label.config(cursor="arrow")
                self.image_label.unbind("<Button-1>")

                
            def show_tooltip(event):
                global tooltip
                tooltip = tk.Toplevel(self.root)
                tooltip.wm_overrideredirect(True)
                tooltip.wm_geometry(f"+{event.x_root + 10}+{event.y_root + 10}")
                label = tk.Label(tooltip, text=self.current_answer, bg="white", fg="black", relief="solid", borderwidth=1, font=("Berlin Sans FB Demi", 11))
                label.pack()

            def hide_tooltip(event):
                global tooltip
                if tooltip:
                    tooltip.destroy()
                    tooltip = None

            self.image_label.bind("<Enter>", show_tooltip)
            self.image_label.bind("<Leave>", hide_tooltip)

    def stop(self):
        pygame.mixer.music.stop()
        self.emoji_label.config(text="")
        self.playing = False
        self.paused = False
        self.pause_button.config(text="⏸️", bg="#f44336")

    def toggle_pause(self):
        if self.playing:
            if self.paused:
                pygame.mixer.music.unpause()
                self.pause_button.config(text="⏸️", bg="#f44336", relief="raised")
                # self.pause_tooltip.hide()
                # self.pause_tooltip.text = "Pause"
                self.paused = False
            else:
                pygame.mixer.music.pause()
                self.pause_button.config(text="▶️", bg="#4CAF50", relief="sunken")
                # self.pause_tooltip.hide()
                # self.pause_tooltip.text = "Reprendre"
                self.paused = True
                self.emoji_label.config(text="")

    def update_score(self):
        self.score_label.config(text=f"Score {self.score}/{self.total}")

    def validate(self):
        self.total += 1
        is_correct = self.liste_reponse.selection_get() == self.current_answer
        if is_correct:
            self.score += 1
            self.result.config(text="✔️ Bonne réponse !", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nC'était : {self.current_answer}", fg="red")
        self.play_feedback_sound(is_correct)
        self.validate_button["state"] = "disabled"
        self.liste_reponse["state"]   = "disabled"
        self.next_button["state"]     = "normal"
        self.update_score()
        self.show_image()
        if PAUSE_ON_VALIDATE and not self.paused:
            self.toggle_pause()

if __name__ == "__main__":
    if sys.platform == "win32":
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("BlindTestOiseaux")

    root = tk.Tk()
    root.iconbitmap(icon_path)

    # Change l'image dans la barre des tâches (nécessite une image en .png)
    try:
        icon_img = ImageTk.PhotoImage(file=resource_path("images/oiseau.png"))
        root.iconphoto(True, icon_img)
    except Exception as e:
        print("Erreur chargement icône:", e)

    # Initialisation de pygame
    pygame.mixer.init()

    app = BlindTestApp(root)
    app.play_random_sound()

    root.mainloop()