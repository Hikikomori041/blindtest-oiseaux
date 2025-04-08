import os
import sys
import ctypes
import tkinter as tk
import random
from ttkbootstrap.constants import *

# Imports des fichiers locaux
from data import set_category, load_data
category = sys.argv[1] if len(sys.argv) > 1 else "de plaine"
set_category(category)
load_data()

from data import base_dossier, success_sound, failure_sound, icon_path, sons, noms_oiseaux, sons_par_oiseau

from sounds import play_sound, stop_sound, pause_sound, unpause_sound, is_playing, play_feedback
from images import afficher_image, tooltip_bindings
from gui import setup_controls, setup_dropdown


class BlindTestApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Blind-Test Oiseaux")
        self.root.geometry("700x800")
        self.root.option_add("*Font", "{Berlin Sans FB Demi} 12")
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

        self.emoji_label = tk.Label(root, text="")
        self.emoji_label.pack()

        self.status_label = tk.Label(root, text="", fg="gray")
        self.status_label.pack()

        self.score_label = tk.Label(root, text="", fg="blue")
        self.score_label.pack(pady=5)

        self.pause_button, self.switch_button = setup_controls(root, self.replay, self.toggle_pause, self.next_sound_variant)

        self.choix = tk.StringVar()
        self.dropdown_label, self.dropdown_arrow = setup_dropdown(root, self.choix, noms_oiseaux, self.toggle_menu)
        self.menu_popup = None

        self.validate_button = tk.Button(root, text="✅ Valider", command=self.validate, width=25, height=2, bg="#FF9800", fg="white")
        self.validate_button.pack(pady=20)
        self.validate_button["state"] = "disabled"

        self.next_button = tk.Button(root, text="➡️ Oiseau suivant", command=self.play_random_sound, width=28, height=2, bg="#3F51B5", fg="white")
        self.next_button.pack(padx=5)
        self.next_button["state"] = "disabled"

        self.result = tk.Label(root, text="", font=("Helvetica", 14, "bold"))
        self.result.pack(pady=5)

        self.image_canvas = tk.Canvas(root, width=200, height=200, highlightthickness=0, bg=root["bg"])
        self.image_canvas.pack(pady=10)

        self.animate_emoji()
        self.check_sound_end()

    def play_random_sound(self):
        stop_sound()
        possible_sounds = [s for s in sons if s[0] != self.previous_answer] if self.previous_answer else sons
        nom, path = random.choice(possible_sounds)
        self.current_answer = nom
        self.previous_answer = nom
        self.current_sound_index = sons_par_oiseau[nom].index(path)
        self.current_sound_path = path
        self.play_sound()

    def play_sound(self):
        self.duration = play_sound(self.current_sound_path)
        self.result.config(text="")
        self.status_label.config(text="")
        self.choix.set("")
        self.validate_button["state"] = "normal"
        self.next_button["state"] = "disabled"
        self.image_canvas.delete("all")
        self.playing = True
        self.paused = False
        self.pause_button.config(text="⏸️ Pause", bootstyle="danger")

    def next_sound_variant(self):
        if self.current_answer and self.current_answer in sons_par_oiseau:
            variants = sons_par_oiseau[self.current_answer]
            if len(variants) > 1:
                self.current_sound_index = (self.current_sound_index + 1) % len(variants)
                self.current_sound_path = variants[self.current_sound_index]
                self.play_sound()

    def replay(self):
        if self.current_sound_path:
            play_sound(self.current_sound_path)
            self.playing = True
            self.paused = False
            self.pause_button.config(text="⏸️ Pause")
            self.status_label.config(text="")

    def stop(self):
        stop_sound()
        self.emoji_label.config(text="")
        self.status_label.config(text="")
        self.playing = False
        self.paused = False
        self.pause_button.config(text="⏸️ Pause")

    def toggle_pause(self):
        if self.playing:
            if self.paused:
                unpause_sound()
                self.pause_button.config(text="⏸️ Pause", bootstyle="danger")
                self.paused = False
            else:
                pause_sound()
                self.pause_button.config(text="▶️ Reprendre", bootstyle="success")
                self.paused = True
                self.emoji_label.config(text="")
                self.status_label.config(text="")

    def toggle_menu(self, event=None):
        if self.menu_popup and self.menu_popup.winfo_exists():
            self.menu_popup.destroy()
            return

        self.menu_popup = tk.Toplevel(self.root)
        self.menu_popup.wm_overrideredirect(True)
        x = self.dropdown_label.winfo_rootx()
        y = self.dropdown_label.winfo_rooty() + self.dropdown_label.winfo_height()
        self.menu_popup.geometry(f"400x200+{x}+{y}")

        listbox = tk.Listbox(
            self.menu_popup,
            font=("Comic Sans MS", 12),
            bg="#48dbfb",
            fg="black",
            selectbackground="#feca57",
            selectforeground="black"
        )
        listbox.pack(fill="both", expand=True)

        for nom in noms_oiseaux:
            listbox.insert(tk.END, nom)

        def on_select(event):
            if listbox.curselection():
                index = listbox.curselection()[0]
                self.choix.set(listbox.get(index))
                self.menu_popup.destroy()

        listbox.bind("<ButtonRelease-1>", on_select)

    def validate(self):
        self.total += 1
        is_correct = self.choix.get() == self.current_answer
        if is_correct:
            self.score += 1
            self.result.config(text="✔️ Bonne réponse !", fg="green")
        else:
            self.result.config(text=f"❌ Mauvais choix !\nC'était : {self.current_answer}", fg="red")
        play_feedback(success_sound if is_correct else failure_sound, 0.2 if is_correct else 0.08)
        self.validate_button["state"] = "disabled"
        self.next_button["state"] = "normal"
        self.emoji_label.config(text="")
        self.update_score()
        afficher_image(self.image_canvas, os.path.join(base_dossier, self.current_answer, "image.jpg"), self.current_answer, base_dossier)
        tooltip_bindings(self.image_canvas, self.current_answer, self.root)

    def update_score(self):
        self.score_label.config(text=f"Score: {self.score} / {self.total}")

    def animate_emoji(self):
        if self.playing and not self.paused:
            emoji = self.emoji_sequence[self.animation_index % len(self.emoji_sequence)]
            self.emoji_label.config(text=emoji + " 🎶")
            self.animation_index += 1
        self.root.after(400, self.animate_emoji)

    def check_sound_end(self):
        if self.playing and not self.paused:
            if not is_playing():
                self.playing = False
                self.status_label.config(text="Son terminé.")
                self.emoji_label.config(text="")
        self.root.after(500, self.check_sound_end)

if __name__ == "__main__":
    if sys.platform == "win32":
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID("BlindTestOiseaux")

    root = tk.Tk()
    root.option_add("*Font", "{Berlin Sans FB} 14")
    root.geometry("840x780")

    # Fond d'écran
    fond_path = os.path.join(base_dossier, "fond.png")
    if os.path.exists(fond_path):
        background_image = tk.PhotoImage(file=fond_path)
        background_label = tk.Label(root, image=background_image)
        background_label.place(x=0, y=0, relwidth=1, relheight=1)

    root.iconbitmap(icon_path)
    app = BlindTestApp(root)
    app.play_random_sound()
    root.mainloop()
