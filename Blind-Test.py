import os
# Désactiver le message d'accueil de pygame
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import random
import tkinter as tk
from tkinter import ttk
from PIL import Image, ImageTk
import pygame
from mutagen.mp3 import MP3  # Sert à obtenir la durée du fichier mp3
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
def center_window(window, width=700, height=800):
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    x = int((screen_width / 2) - (width / 2))
    y = int((screen_height / 2) - (height / 2))
    window.geometry(f"{width}x{height}+{x}+{y}")

# Chemin des ressources
base_dossier = resource_path("oiseaux/de plaine/")
icon_path = resource_path("images/oiseau.ico")
success_sound = resource_path("sons/succes.mp3")
failure_sound = resource_path("sons/erreur.mp3")

sons = []
noms_oiseaux = []
sons_par_oiseau = {}

# Scan des sous-dossiers (1 dossier = 1 oiseau)
for nom in os.listdir(base_dossier):
    chemin = os.path.join(base_dossier, nom)
    if os.path.isdir(chemin):
        fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
        sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
        for fichier in fichiers:
            sons.append((nom, os.path.join(chemin, fichier)))
        noms_oiseaux.append(nom)

class BlindTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blind-Test Oiseaux Charente")
        center_window(self.root)
        self.root.geometry("840x780")
        self.root.option_add("*Font", "{Berlin Sans FB} 14")
        self.current_sound_path = None
        self.current_answer = None
        self.previous_answer = None
        self.playing = False
        self.paused = False
        self.duration = 1
        self.animation_index = 0
        self.current_sound_index = 0
        self.score = 0
        self.total = 0
        self.emoji_sequence = ["🕊️", "🐦", "🐤", "🦜"]

        # Emoji animé
        self.emoji_label = tk.Label(root, text="")
        self.emoji_label.pack()

        # État du son
        self.status_label = tk.Label(root, text="", fg="gray")
        self.status_label.pack()

        # Score
        self.score_label = tk.Label(root, text="", fg="blue")
        self.score_label.pack(pady=5)

        # Contrôles son
        controls = tk.Frame(root)
        controls.pack()
        tk.Button(controls, text="⏮️ Rejouer", command=self.replay, width=10, height=2, bg="#2196F3", fg="white").pack(side=tk.LEFT, padx=5, pady=10)
        self.pause_button = tk.Button(controls, text="⏸️ Pause", command=self.toggle_pause, width=28, height=2, bg="#f44336", fg="white", relief="groove", bd=2, highlightbackground="#f44336", highlightthickness=1)
        self.pause_button.pack(side=tk.LEFT, padx=5)
        self.switch_button = tk.Button(controls, text="🎵 Autre son de cet oiseau", command=self.next_sound_variant, width=25, height=2, bg="#9C27B0", fg="white")
        self.switch_button.pack(pady=10)

        # Liste des réponses
        self.choix = tk.StringVar()
        self.choix.set(noms_oiseaux[0])  # Valeur par défaut

        self.dropdown = tk.OptionMenu(root, self.choix, *noms_oiseaux)
        menu = self.dropdown["menu"]
        menu.config(
            font=("Comic Sans MS", 14),
            bg="#48dbfb",              # bleu lagon
            fg="black",
            activebackground="#feca57",# orange mangue
            activeforeground="black",
            bd=2
        )
        self.dropdown.config(
            font=("Comic Sans MS", 14, "italic"),
            bg="#ffe066",               # jaune vif tropical
            fg="#1a1a1a",               # texte sombre pour contraste
            activebackground="#ff6b6b", # rouge corail en survol
            activeforeground="white",   # texte blanc au survol
            relief="ridge",
            bd=3,
            highlightthickness=2,
            highlightbackground="#1dd1a1",  # vert menthe des forêts enchantées
            width=40,
            height=1
        )
        self.dropdown.pack(pady=25, ipady=4)

        # Bouton valider
        self.validate_button = tk.Button(root, text="✅ Valider", command=self.validate, width=25, height=2, bg="#FF9800", fg="white")
        self.validate_button.pack(pady=20)
        self.validate_button["state"] = "disabled"
        
        # Bouton son suivant
        self.next_button = tk.Button(root, text="➡️ Oiseau suivant", command=self.play_random_sound, width=28, height=2, bg="#3F51B5", fg="white")
        self.next_button.pack(padx=5)
        self.next_button["state"] = "disabled"

        # Résultat
        self.result = tk.Label(root, text="", font=("Helvetica", 14, "bold"))
        self.result.pack(pady=5)        

        # Image
        self.image_label = tk.Label(root)
        self.image_label.pack(pady=10)

        self.animate_emoji()
        self.check_sound_end()

    def play_feedback_sound(self, success):
        sound_path = success_sound if success else failure_sound
        sound = pygame.mixer.Sound(sound_path)
        if success:
            sound.set_volume(0.2)  # Volume entre 0.0 (silence) et 1.0 (max)
        else:
            sound.set_volume(0.08)
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
        audio = MP3(self.current_sound_path)
        self.duration = int(audio.info.length)
        pygame.mixer.music.load(self.current_sound_path)
        pygame.mixer.music.play()
        self.result.config(text="")
        self.status_label.config(text="")
        # self.choix.set("")
        self.choix.set(self.choix.get())
        self.validate_button["state"] = "normal"
        self.next_button["state"] = "disabled"
        self.dropdown["state"] = "normal"
        self.image_label.config(image="")
        self.image_label.image = None
        self.playing = True
        self.paused = False
        self.pause_button.config(text="⏸️ Pause", bg="#f44336")

    def next_sound_variant(self):
        if self.current_answer and self.current_answer in sons_par_oiseau:
            variants = sons_par_oiseau[self.current_answer]
            if len(variants) > 1:
                self.current_sound_index = (self.current_sound_index + 1) % len(variants)
                self.current_sound_path = variants[self.current_sound_index]
                self.play_sound()

    def replay(self):
        if self.current_sound_path:
            pygame.mixer.music.load(self.current_sound_path)
            pygame.mixer.music.play()
            self.playing = True
            self.paused = False
            self.pause_button.config(text="⏸️ Pause", bg="#f44336")
            self.status_label.config(text="")

    def stop(self):
        pygame.mixer.music.stop()
        self.emoji_label.config(text="")
        self.status_label.config(text="")
        self.playing = False
        self.paused = False
        self.pause_button.config(text="⏸️ Pause", bg="#f44336")

    def toggle_pause(self):
        if self.playing:
            if self.paused:
                pygame.mixer.music.unpause()
                self.pause_button.config(text="⏸️ Pause", bg="#f44336")
                self.paused = False
            else:
                pygame.mixer.music.pause()
                self.pause_button.config(text="▶️ Reprendre", bg="#4CAF50")
                self.paused = True
                self.emoji_label.config(text="")
                self.status_label.config(text="")

    def validate(self):
        self.total += 1
        is_correct = self.choix.get() == self.current_answer
        if is_correct:
            self.score += 1
            self.result.config(text="✔️ Bonne réponse !", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nC'était : {self.current_answer}", fg="red")
        self.play_feedback_sound(is_correct)
        self.validate_button["state"] = "disabled"
        self.next_button["state"] = "normal"
        self.dropdown["state"] = "disabled"
        self.emoji_label.config(text="")
        self.update_score()
        self.show_image()
        if not self.paused:
            self.toggle_pause()

    def update_score(self):
        self.score_label.config(text=f"Score {self.score}/{self.total}")

    def show_image(self):
        image_path = os.path.join(base_dossier, self.current_answer, "image.jpg")
        if os.path.exists(image_path):
            self.original_image = Image.open(image_path)
            self.zoom_step = 0
            self.animate_image_zoom()

    def animate_image_zoom(self):
        if self.zoom_step <= 10:
            size = int(50 + self.zoom_step * 20)
            img = self.original_image.resize((size, size))
            photo = ImageTk.PhotoImage(img)
            self.image_label.config(image=photo)
            self.image_label.image = photo
            self.zoom_step += 3
            self.root.after(40, self.animate_image_zoom)

    def animate_emoji(self):
        if self.playing and not self.paused:
            emoji = self.emoji_sequence[self.animation_index % len(self.emoji_sequence)]
            self.emoji_label.config(text=emoji + " 🎶")
            self.animation_index += 1
        self.root.after(400, self.animate_emoji)

    def check_sound_end(self):
        if self.playing and not self.paused:
            if not pygame.mixer.music.get_busy():
                self.playing = False
                self.status_label.config(text="Son terminé.")
                self.emoji_label.config(text="")
        self.root.after(500, self.check_sound_end)

if __name__ == "__main__":
    if sys.platform == "win32":
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("BlindTestOiseaux")

    root = tk.Tk()
    root.iconbitmap(icon_path)

    # Initialisation de pygame
    pygame.mixer.init()

    app = BlindTestApp(root)
    app.play_random_sound()
    root.mainloop()