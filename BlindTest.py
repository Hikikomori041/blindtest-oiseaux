import os
from tkinter import ttk
# Désactive le message d'accueil de pygame
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import random
import tkinter as tk
from PIL import Image, ImageTk
import pygame
from mutagen.mp3 import MP3  # Sert à obtenir la durée du fichier mp3
import sys
import ctypes
import webbrowser

# HEIGHT = 840
# WIDTH = 780

# Pour compatibilité PyInstaller : récupérer chemin d'exécution
def resource_path(relative_path):
    try:
        base_path = os.path.join(sys._MEIPASS, "ressources")
    except Exception:
        base_path = os.path.abspath("ressources")
    return os.path.join(base_path, relative_path)

# Fonction pour centrer la fenêtre à l'écran
def center_window(window, width=780, height=840):
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    x = int((screen_width / 2) - (width / 2))
    y = int((screen_height / 2) - (height / 2))
    window.geometry(f"{width}x{height}+{x}+{y}")

# Chemin des ressources
if len(sys.argv) > 1:
    selected_category = sys.argv[1]
else:
    selected_category = "de plaine"

base_dossier = resource_path(os.path.join("oiseaux", selected_category))
# base_dossier = resource_path("oiseaux/de plaine/")

icon_path = resource_path("images/oiseau.ico")
success_sound = resource_path("sons/succes.mp3")
failure_sound = resource_path("sons/erreur.mp3")

sons = []
noms_oiseaux = []
types_oiseaux = ["Tous", "De plaine", "Communs"]
sons_par_oiseau = {}

tooltip = None

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
        self.root.title("Blind-Test oiseaux " + selected_category)
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
        self.type_actuel = types_oiseaux[0]

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
            font=("Berlin Sans FB", 12),
            bg="#666666",
            fg="white"
        )
        self.liste_type.config(
            font=("Berlin Sans FB", 12),
            bg="#444444",
            fg="white"
        )
        self.liste_type.pack()

        # Emoji animé
        self.emoji_label = tk.Label(root, text="")
        self.emoji_label.pack()
        # self.emoji_label.place(x=340, y=5)

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
        self.switch_button.pack(padx=5, pady=10)

        # Liste des réponses
        self.choix_reponse = tk.StringVar()
        self.choix_reponse.set(noms_oiseaux[0])  # Valeur par défaut

        self.liste_reponse = tk.OptionMenu(root, self.choix_reponse, *noms_oiseaux)
        menu = self.liste_reponse["menu"]
        menu.config(
            font=("Comic Sans MS", 12),
            bg="#ffc044",
            fg="black",
            # activebackground="#feca57",# orange mangue
            activebackground="#48dbfb",
            activeforeground="white",
            bd=2
        )
        self.liste_reponse.config(
            font=("Comic Sans MS", 14, "italic"),
            bg="#ffe066",               # jaune vif tropical
            fg="#1a1a1a",               # texte sombre pour contraste
            # activebackground="#ff6b6b", # rouge corail en survol
            activebackground="#48dbfb", # en survol
            activeforeground="white",   # texte blanc au survol
            relief="ridge",
            bd=3,
            highlightthickness=2,
            highlightbackground="#1dd1a1",  # vert menthe des forêts enchantées
            width=40,
            height=1
        )
        self.liste_reponse.pack(pady=25, ipady=4)

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
        # self.image_label = tk.Label(root, cursor="hand2")
        self.image_label.pack(pady=10)
        

        self.animate_emoji()
        self.check_sound_end()

    def change_type(self, type_choisi):
        if type_choisi != self.type_actuel:
            print("Changement de type:", type_choisi)
            self.type_actuel = type_choisi

            dossier = "de plaine" if type_choisi == "De plaine" else "communs" if type_choisi == "Communs" else "tous"
            global base_dossier, sons, noms_oiseaux, sons_par_oiseau
            base_dossier = resource_path(os.path.join("oiseaux", dossier))
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

            # Mettre à jour la liste des réponses
            menu = self.liste_reponse["menu"]
            menu.delete(0, "end")
            for nom in noms_oiseaux:
                menu.add_command(label=nom, command=lambda val=nom: self.choix_reponse.set(val))

            if noms_oiseaux:
                self.choix_reponse.set(noms_oiseaux[0])

            self.play_random_sound()


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
        self.choix_reponse.set(self.choix_reponse.get())
        self.validate_button["state"] = "normal"
        self.next_button["state"] = "disabled"
        self.liste_reponse["state"] = "normal"
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
        is_correct = self.choix_reponse.get() == self.current_answer
        if is_correct:
            self.score += 1
            self.result.config(text="✔️ Bonne réponse !", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nC'était : {self.current_answer}", fg="red")
        self.play_feedback_sound(is_correct)
        self.validate_button["state"] = "disabled"
        self.next_button["state"] = "normal"
        self.liste_reponse["state"] = "disabled"
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
            def open_link(event=None):
                link_path = os.path.join(base_dossier, self.current_answer, "lien.txt")
                if os.path.exists(link_path):
                    with open(link_path, "r", encoding="utf-8") as f:
                        url = f.read().strip()
                        if url:
                            webbrowser.open(url)

            self.image_label.unbind("<Button-1>")
            self.image_label.bind("<Button-1>", open_link)

            link_path = os.path.join(base_dossier, self.current_answer, "lien.txt")
            if os.path.exists(link_path):
                self.image_label.config(cursor="hand2")
                self.image_label.unbind("<Button-1>")
                self.image_label.bind("<Button-1>", lambda e: webbrowser.open(open(link_path, encoding="utf-8").read().strip()))
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

    # Fond d'écran
    background_image = tk.PhotoImage(file=os.path.join(base_dossier, "fond.png"))
    background_label = tk.Label(root, image=background_image)
    background_label.place(x=0, y=0, relwidth=1, relheight=1)

    # Initialisation de pygame
    pygame.mixer.init()

    app = BlindTestApp(root)
    app.play_random_sound()


    root.mainloop()