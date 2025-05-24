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
try:
    from PIL import ImageResampling
    RESAMPLING = ImageResampling.LANCZOS
except ImportError:
    RESAMPLING = Image.LANCZOS  # Pour les versions avant Pillow 10

WIDTH  = 1024
HEIGHT = 720

PAUSE_ON_VALIDATE = False

TYPES_MAPPING = {
    "Communs":  "commun",
    "D'eau":    "eau",
    "De plaine":"plaine"
}

# Fonction pour centrer la fenêtre à l'écran
def center_window(window, width=WIDTH, height=HEIGHT):
    screen_width = window.winfo_screenwidth()
    screen_height = window.winfo_screenheight()
    x = int((screen_width / 2) - (width / 2))
    y = int((screen_height / 2) - (height / 2))
    window.geometry(f"{width}x{height}+{x}+{y}")

def maximise_window(window):
    try:
        window.state('zoomed')  # Windows
    except:
        window.attributes('-zoomed', True)  # Linux

# Pour compatibilité PyInstaller : récupérer chemin d'exécution
def resource_path(relative_path):
    base_path = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.abspath(".")
    return os.path.join(base_path, "ressources", relative_path)


# Chemin des ressources
json_path = os.path.join(resource_path("data"), "oiseaux.json")
with open(json_path, encoding="utf-8") as f:
    donnees_oiseaux = json.load(f)

base_dossier  = resource_path("oiseaux/")
icon_path     = resource_path("images/oiseau.ico")
success_sound = resource_path("sons/succes.mp3")
failure_sound = resource_path("sons/erreur.mp3")

types_oiseaux = ["Communs", "D'eau", "De plaine"]
tooltip       = None

sons          = []
noms_oiseaux  = []
sons_par_oiseau = {}

for nom, infos in donnees_oiseaux.items():
    chemin = os.path.join(base_dossier, nom)
    fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
    sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
    for fichier in fichiers:
        sons.append((nom, os.path.join(chemin, fichier)))
    noms_oiseaux.append(nom)
noms_oiseaux.sort()

def get_name_in(nom_oiseau, langue="latin"):
    if langue == "latin":
        return donnees_oiseaux.get(nom_oiseau, {}).get("nom_latin")
    return nom_oiseau
    

class Tooltip:
    def __init__(self, widget, text):
        self.widget = widget
        self.text = text
        self.tip_window = None
        widget.bind("<Enter>", self.show)
        widget.bind("<Leave>", self.hide)
        widget.bind("<ButtonPress>", self.hide)

    def show(self, event=None):
        if self.tip_window or not self.text:
            return
        self.after_id = self.widget.after(500, self._really_show)

    def hide(self, event=None):
        if self.after_id:
            self.widget.after_cancel(self.after_id)
            self.after_id = None
        if self.tip_window and self.tip_window.winfo_exists():
            self.tip_window.destroy()
            self.tip_window = None

    def _really_show(self):
        if self.tip_window or not self.text:
            return
        x, y, _, cy = self.widget.bbox("insert")
        x += self.widget.winfo_rootx() + 25
        y += self.widget.winfo_rooty() + 20
        self.tip_window = tw = tk.Toplevel(self.widget)
        tw.wm_overrideredirect(True)
        tw.attributes("-topmost", True)
        tw.geometry(f"+{x}+{y}")
        label = tk.Label(tw, text=self.text, background="#ffffe0", relief="solid", borderwidth=1, font=("Berlin Sans FB", 12))
        label.pack()

class BlindTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blind-Test Oiseaux")
        self.root.geometry(str(WIDTH) + "x" + str(HEIGHT))
        self.root.minsize(WIDTH, HEIGHT)
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
        self.result_font_size = 3
        self.play_counts = {nom: 0 for nom in noms_oiseaux}
        self.affichage_vers_nom = {}

        # self.root.wm_attributes('-transparentcolor','#222222')
        # self.root.wm_attributes('-transparentcolor', root['bg'])
        
        # Fond d'écran
        self.background_image = None
        self.background_label = tk.Label(root)
        self.background_label.place(x=0, y=0, relwidth=1, relheight=1)

        image_path = os.path.join(resource_path("images"), "default.png")
        if os.path.exists(image_path):
            # self.background_image = tk.PhotoImage(file=image_path)
            self.original_background = Image.open(image_path)
            self.update_background()
            self.background_label.config(image=self.background_image)
            self.background_label.lower()
        self.update_bg_after_id = None
        self.root.bind("<Configure>", self.schedule_background_update)

        # Choix du type d'oiseaux
        type = tk.Frame(root)
        type.pack()
        type.place(x=5, y=5)
        self.type_label = tk.Label(type, text="Type d'oiseaux:").pack(side=tk.LEFT, padx=1, pady=1)

        self.types_vars = []
        self.type_checkboxes = []

        for nom_affiché in TYPES_MAPPING:
            var = tk.BooleanVar()
            checkbox = tk.Checkbutton(type, text=nom_affiché, variable=var, command=self.update_type_checkboxes)
            checkbox.select()
            checkbox.pack(anchor='w')
            self.types_vars.append(var)
            self.type_checkboxes.append(checkbox)


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

        self.root.bind("<space>", lambda e: (self.pause_button.invoke(), "break"))
        self.root.bind("<r>", lambda e: (self.replay_button.invoke(), "break"))
        self.root.bind("<s>", lambda e: (self.switch_button.invoke(), "break"))
        self.root.bind("<Left>", lambda e: (self.rewind_button.invoke()) or "break")
        self.root.bind("<Right>", lambda e: (self.fast_forward_button.invoke()) or "break")

        Tooltip(self.replay_button,       "Réécouter (r)")
        Tooltip(self.rewind_button,       "Reculer de 5 secondes (←)")
        # self.pause_tooltip = Tooltip(self.pause_button, "Pause")
        Tooltip(self.fast_forward_button, "Avancer de 5 secondes (→)")
        Tooltip(self.switch_button,       "Autre son de cet oiseau (s)")

        # Liste des réponses
        choice = tk.Frame(root, width=40)
        choice.pack(pady=5)

        tk.Label(choice, text='À quel oiseau appartient ce chant ou ce cri ?', bg='#aaa', font=("Berlin Sans FB Demi", 14), height=2).pack(fill='x')

        self.liste_reponse = tk.Listbox(choice, width=52, height=30, cursor="hand2")
        self.liste_reponse.pack(side=tk.LEFT)
        
        self.init_liste_oiseaux(noms_oiseaux)

        # self.root.bind("<Return>", lambda e: (self.validate(), "break"))
        self.liste_reponse.bind("<Return>", lambda e: self.validate())
        # self.liste_reponse.bind("<Button-2>", self.show_context_menu)
        self.liste_reponse.bind("<Button-3>", self.show_context_menu)
        self.liste_reponse.bind("<Double-Button-1>", lambda e: self.validate())
        self.liste_reponse.config(font=("Consolas", 13))

        self.context_menu = tk.Menu(self.liste_reponse, tearoff=0)
        self.context_menu.add_command(label="🎧 Écouter cet oiseau", command=self.play_selected_sound)
        self.context_menu.add_command(label="🌐 Visualiser cet oiseau", command=self.see_bird_website)

        # Bouton valider
        self.validate_button = tk.Button(choice, text="✅ Valider", command=self.validate, width=24, height=2, bg="#FF9800", fg="white", cursor="hand2")
        self.validate_button.pack(padx=96, pady=10)
        self.validate_button["state"] = "disabled"
        
        # Bouton son suivant
        self.next_button = tk.Button(choice, text="🔀 Oiseau suivant", command=self.play_random_sound, width=24, height=2, bg="#3F51B5", fg="white")
        self.next_button.pack(padx=5, pady=10)
        self.next_button["state"] = "disabled"
        self.root.bind("<n>", lambda e: (self.next_button.invoke(), "break"))

        # Résultat
        self.result = tk.Label(choice, font=("Helvetica", self.result_font_size, "bold"))
        self.result.pack(pady=5)

        # Image
        self.image_label = tk.Label(choice)
        self.image_label.pack(pady=10)

        self.animate_emoji()
        self.check_sound_end()

    def init_liste_oiseaux(self, noms_oiseaux):
        self.liste_reponse.delete(0, tk.END)
        for nom_oiseau in noms_oiseaux:
            nom_latin = get_name_in(nom_oiseau, "latin")
            nom_affiche = f"{nom_oiseau:<26} ({nom_latin})"
            self.liste_reponse.insert('end', nom_affiche)
            self.affichage_vers_nom[nom_affiche] = nom_oiseau  # stockage du vrai nom

            type_oiseau = donnees_oiseaux[nom_oiseau]["type"]
            couleur = {
                "commun": "#fff5e6",    # jaune pâle
                "eau":    "#e6f7ff",    # bleu clair      
                "plaine": "#e8ffe6"     # vert très pâle
            }.get(type_oiseau, "white")

            index = self.liste_reponse.size() - 1
            self.liste_reponse.itemconfig(index, {'bg': couleur})


        self.liste_reponse.select_set(0)
        self.liste_reponse.activate(0)
        self.liste_reponse.see(0)
        self.liste_reponse.focus_set()

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
        else:
            self.next_button["state"] = "normal"

    def animate_result_text(self):
        if self.result_font_size <= 12:
            self.result.config(font=("Helvetica", self.result_font_size, "bold"))
            self.result_font_size += 3
            self.root.after(40, self.animate_result_text)

    def change_type(self):
        types_choisis = self.get_selected_types()

        global sons, noms_oiseaux, sons_par_oiseau
        sons = []
        noms_oiseaux = []
        sons_par_oiseau = {}

        def type_valide(info_type):
            return info_type in types_choisis

        for nom, infos in donnees_oiseaux.items():
            if not types_choisis or type_valide(infos["type"]):
                chemin = os.path.join(base_dossier, nom)
                fichiers = [f for f in os.listdir(chemin) if f.endswith(".mp3")]
                sons_par_oiseau[nom] = [os.path.join(chemin, f) for f in fichiers]
                for fichier in fichiers:
                    sons.append((nom, os.path.join(chemin, fichier)))
                noms_oiseaux.append(nom)
            noms_oiseaux.sort()

        # Mettre à jour le fond d'écran si un seul type est sélectionné
        if len(types_choisis) == 1:
            type_unique = types_choisis[0]
            image_name = {
                "commun": "communs.png",
                "eau": "eau.png",
                "plaine": "plaine.png"
            }.get(type_unique, "default.png")
        else:
            image_name = "default.png"

        image_path = os.path.join(resource_path("images"), image_name)
        if os.path.exists(image_path):
            self.original_background = Image.open(image_path)
            self.update_background(force=True)
            self.background_label.config(image=self.background_image)
            self.background_label.lower()
        else:
            print("Fond d'écran introuvable:", image_path)

        # Mise à jour des options de réponses
        if noms_oiseaux:
            self.init_liste_oiseaux(noms_oiseaux)

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

    def get_selected_types(self):
        return [TYPES_MAPPING[nom_affiché] for nom_affiché, var in zip(TYPES_MAPPING, self.types_vars) if var.get()]

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
        
        # Si t’as filtré les sons par type :
        candidats = [s for s in sons if s[0] != self.previous_answer] if self.previous_answer else sons

        # On pondère selon le nombre de fois que chaque oiseau a été entendu
        poids = []
        for nom, _ in candidats:
            count = self.play_counts.get(nom, 0)
            poids.append(1 / (1 + count))  # plus il a été écouté, plus c’est faible

        total = sum(poids)
        proba = [p / total for p in poids]

        index = random.choices(range(len(candidats)), weights=proba, k=1)[0]
        nom, path = candidats[index]

        self.current_answer = nom
        self.previous_answer = nom
        self.current_sound_index = sons_par_oiseau[nom].index(path)
        self.current_sound_path = path
        self.play_counts[nom] += 1  # on incrémente ici
        self.play_sound()

    def play_selected_sound(self):
        selected = self.liste_reponse.curselection()
        if not selected:
            return
        nom_formatte = self.liste_reponse.get(selected[0])
        nom = self.affichage_vers_nom.get(nom_formatte)
        if nom in sons_par_oiseau:
            self.stop()
            self.current_answer = nom
            self.previous_answer = nom
            self.current_sound_index = 0
            self.current_sound_path = sons_par_oiseau[nom][0]
            self.play_sound()

    def play_sound(self):
        pygame.mixer.music.load(self.current_sound_path)
        pygame.mixer.music.play()
        self.result.config(text="")
        
        self.validate_button["state"] = "normal"
        self.liste_reponse["state"]   = "normal"
        self.next_button["state"]     = "disabled"
        self.image_label.config(image="")
        self.image_label.image = None
        self.playing = True
        self.paused = False
        self.pause_button.config(text="⏸️", bg="#f44336")
        self.validate_button.config(cursor="hand2")
        self.next_button.config(cursor="arrow")
        self.liste_reponse.bind("<Return>", lambda e: self.validate())
        self.liste_reponse.bind("<Double-Button-1>", lambda e: self.validate())

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

    def schedule_background_update(self, event=None):
        if self.update_bg_after_id:
            self.root.after_cancel(self.update_bg_after_id)
        self.update_bg_after_id = self.root.after(50, self.update_background)

    def see_bird_website(self):
        selected = self.liste_reponse.curselection()
        if not selected:
            return
        nom_affiche = self.liste_reponse.get(selected[0])
        nom = self.affichage_vers_nom.get(nom_affiche)
        lien = "https://www.oiseaux.net/oiseaux/" + donnees_oiseaux.get(nom, {}).get("lien") + ".html"
        webbrowser.open(lien)

    def show_context_menu(self, event):
        try:
            index = self.liste_reponse.nearest(event.y)
            self.liste_reponse.selection_clear(0, tk.END)
            self.liste_reponse.selection_set(index)
            self.liste_reponse.activate(index)
            self.context_menu.post(event.x_root, event.y_root)
        except:
            pass

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
                label = tk.Label(tooltip, text=self.current_answer, bg="white", fg="black", relief="solid", borderwidth=1, font=("Berlin Sans FB", 12))
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
                self.pause_button.config(text="▶️", bg="#4CAF50", relief="groove")
                # self.pause_tooltip.hide()
                # self.pause_tooltip.text = "Reprendre"
                self.paused = True
                self.emoji_label.config(text="")

    def update_background(self, force=False):
        if hasattr(self, 'original_background'):
            width = self.root.winfo_width()
            height = self.root.winfo_height()
            if force or getattr(self, 'last_size', None) != (width, height):
                self.last_size = (width, height)
                resized = self.original_background.resize((width, height), RESAMPLING)
                photo = ImageTk.PhotoImage(resized)
                self.background_label.config(image=photo)
                self.background_label.image = photo

    def update_score(self):
        self.score_label.config(text=f"Score {self.score}/{self.total}")

    def update_type_checkboxes(self):
        cochées = [var.get() for var in self.types_vars]
        nb_cochées = cochées.count(True)

        for checkbox, var in zip(self.type_checkboxes, self.types_vars):
            if nb_cochées == 1 and var.get():
                checkbox.config(state='disabled')  # on bloque la case cochée
            else:
                checkbox.config(state='normal')  # sinon on débloque tout
        self.change_type()

    def validate(self):
        self.result_font_size = 3
        self.result.config(font=("Helvetica", self.result_font_size, "bold"))
        self.total += 1
        selection = self.liste_reponse.selection_get()
        nom_choisi = self.affichage_vers_nom.get(selection)

        is_correct = nom_choisi == self.current_answer
        nom_latin = get_name_in(self.current_answer, "latin")
        nom_a_afficher = f"{self.current_answer}\n({nom_latin})"
        if is_correct:
            self.score += 1
            self.result.config(text=f"✔️ Bonne réponse !\n\n{nom_a_afficher}", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nLa bonne réponse était :\n\n{nom_a_afficher}", fg="red")
        self.animate_result_text()

        self.play_feedback_sound(is_correct)
        self.validate_button.config(cursor="arrow")
        self.next_button.config(cursor="hand2")
        self.validate_button["state"] = "disabled"
        self.liste_reponse["state"]   = "disabled"
        # self.next_button["state"]     = "normal"
        self.liste_reponse.unbind("<Return>")
        self.liste_reponse.unbind("<Double-Button-1>")
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
    
    center_window(root)
    maximise_window(root)

    app.update_background()
    app.play_random_sound()

    root.mainloop()