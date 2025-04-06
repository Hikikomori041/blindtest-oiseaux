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

# Dossier contenant les sons
base_dossier = "oiseaux"
sons = []
noms_oiseaux = []

# Scan des sous-dossiers (1 dossier = 1 oiseau)
for nom in os.listdir(base_dossier):
    chemin = os.path.join(base_dossier, nom)
    if os.path.isdir(chemin):
        fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
        for fichier in fichiers:
            sons.append((nom, os.path.join(chemin, fichier)))
        noms_oiseaux.append(nom)

class BlindTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blind-Test Oiseaux")
        self.root.geometry("700x700")
        self.root.option_add("*Font", "Impact 12")
        self.current_sound_path = None
        self.current_answer = None
        self.previous_answer = None
        self.playing = False
        self.paused = False
        self.duration = 1
        self.animation_index = 0
        self.emoji_sequence = ["🕊️", "🐦", "🐤", "🦜"]

        # Emoji animé
        self.emoji_label = tk.Label(root, text="")
        self.emoji_label.pack()

        # Bouton jouer
        self.play_button = tk.Button(root, text="🎵 Jouer un son aléatoire", command=self.play_random_sound, width=25, height=2, bg="#9C27B0", fg="white")
        self.play_button.pack(pady=10)

        # Contrôles son
        controls = tk.Frame(root)
        controls.pack()
        tk.Button(controls, text="⏮️ Rejouer", command=self.replay, width=10, height=2, bg="#2196F3", fg="white").pack(side=tk.LEFT, padx=5)
        self.pause_button = tk.Button(controls, text="⏸️ Pause", command=self.toggle_pause, width=24, height=2, bg="#f44336", fg="white")
        self.pause_button.pack(side=tk.LEFT, padx=5)

        # Liste des réponses
        self.choix = tk.StringVar()
        self.dropdown = ttk.Combobox(root, textvariable=self.choix, values=noms_oiseaux, state="readonly", width=60)
        self.dropdown.pack(pady=25, ipady=4)
        self.dropdown.configure(height=20)

        # Bouton valider
        self.validate_button = tk.Button(root, text="✅ Valider", command=self.validate, width=25, height=2, bg="#FF9800", fg="white")
        self.validate_button.pack(pady=20)
        self.validate_button["state"] = "disabled"

        # Résultat
        self.result = tk.Label(root, text="", font=("Helvetica", 14, "bold"))
        self.result.pack(pady=5)

        # Image
        self.image_label = tk.Label(root)
        self.image_label.pack(pady=10)

        self.animate_emoji()

    def play_random_sound(self):
        self.stop()
        possible_sounds = [s for s in sons if s[0] != self.previous_answer] if self.previous_answer else sons
        nom, path = random.choice(possible_sounds)
        self.current_answer = nom
        self.previous_answer = nom
        self.current_sound_path = path
        audio = MP3(path)
        self.duration = int(audio.info.length)
        pygame.mixer.music.load(path)
        pygame.mixer.music.play()
        self.result.config(text="")
        self.choix.set("")
        self.validate_button["state"] = "normal"
        self.image_label.config(image="")
        self.image_label.image = None
        self.playing = True
        self.paused = False
        self.pause_button.config(text="⏸️ Pause", bg="#f44336")

    def replay(self):
        if self.current_sound_path:
            pygame.mixer.music.load(self.current_sound_path)
            pygame.mixer.music.play()
            self.playing = True
            self.paused = False
            self.pause_button.config(text="⏸️ Pause", bg="#f44336")

    def stop(self):
        pygame.mixer.music.stop()
        self.emoji_label.config(text="")
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

    def validate(self):
        if self.choix.get() == self.current_answer:
            self.result.config(text="✔️ Bonne réponse !", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nC'était : {self.current_answer}", fg="red")
        self.validate_button["state"] = "disabled"
        self.emoji_label.config(text="")
        self.show_image()

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


    def fade_in(self, widget, alpha):
        if alpha <= 1.0:
            widget.tk.call(widget._w, 'configure', '-alpha', alpha)
            self.root.after(50, lambda: self.fade_in(widget, alpha + 0.1))

    def animate_emoji(self):
        if self.playing and not self.paused:
            emoji = self.emoji_sequence[self.animation_index % len(self.emoji_sequence)]
            self.emoji_label.config(text=emoji + " 🎶")
            self.animation_index += 1
        self.root.after(400, self.animate_emoji)


if __name__ == "__main__":
    if sys.platform == "win32":
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(u"BlindTestOiseaux")
    root = tk.Tk()
    root.iconbitmap("oiseau.ico")

    # Initialisation de pygame
    pygame.mixer.init()

    app = BlindTestApp(root)
    root.mainloop()
