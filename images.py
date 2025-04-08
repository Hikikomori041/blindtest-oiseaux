import os
import webbrowser
import tkinter as tk
from PIL import Image, ImageDraw, ImageTk

def arrondir_image(path, size=(200, 200), radius=30):
    img = Image.open(path).resize(size).convert("RGBA")
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, *size), radius=radius, fill=255)
    img.putalpha(mask)
    return ImageTk.PhotoImage(img)

def afficher_image(canvas, path, current_answer, base_dossier):
    canvas.delete("all")
    img = arrondir_image(path)
    canvas.photo = img  # Préserve la référence
    canvas.create_image(0, 0, anchor="nw", image=img)

    # Lien cliquable
    link_path = os.path.join(base_dossier, current_answer, "lien.txt")
    if os.path.exists(link_path):
        canvas.config(cursor="hand2")
        with open(link_path, encoding="utf-8") as f:
            url = f.read().strip()
        canvas.bind("<Button-1>", lambda e: webbrowser.open(url))
    else:
        canvas.config(cursor="arrow")
        canvas.unbind("<Button-1>")

def tooltip_bindings(widget, text, root):
    tooltip = None

    def show(event):
        nonlocal tooltip
        tooltip = tk.Toplevel(root)
        tooltip.wm_overrideredirect(True)
        tooltip.wm_geometry(f"+{event.x_root + 10}+{event.y_root + 10}")
        label = tk.Label(tooltip, text=text, bg="white", fg="black", relief="solid", borderwidth=1, font=("Arial", 10))
        label.pack()

    def hide(event):
        nonlocal tooltip
        if tooltip:
            tooltip.destroy()
            tooltip = None

    widget.bind("<Enter>", show)
    widget.bind("<Leave>", hide)