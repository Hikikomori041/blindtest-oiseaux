import tkinter as tk
from ttkbootstrap import Style, Button


def setup_controls(root, replay_cb, toggle_cb, switch_cb):
    controls = tk.Frame(root)
    controls.pack()

    tk.Button(
        controls, text="⏮️ Rejouer", command=replay_cb,
        width=10, height=2, bg="#2196F3", fg="white"
    ).pack(side=tk.LEFT, padx=5, pady=10)

    style = Style("flatly")

    pause_button = Button(
        controls, text="⏸️ Pause", command=toggle_cb,
        width=28, bootstyle="danger"
    )
    pause_button.pack(side=tk.LEFT, padx=5, ipady=8)

    switch_button = tk.Button(
        controls, text="🎵 Autre son de cet oiseau",
        command=switch_cb, width=25, height=2,
        bg="#9C27B0", fg="white"
    )
    switch_button.pack(pady=10)

    return pause_button, switch_button


def setup_dropdown(root, choix, noms_oiseaux, toggle_cb):
    dropdown_frame = tk.Frame(root, bg="#1dd1a1", bd=3, relief="ridge")
    dropdown_frame.pack(pady=25)

    choix.set(noms_oiseaux[0])

    dropdown_label = tk.Label(
        dropdown_frame,
        textvariable=choix,
        font=("Comic Sans MS", 14, "bold"),
        bg="#ffe066",
        fg="#1a1a1a",
        padx=10,
        pady=6,
        anchor="w"
    )
    dropdown_label.pack(side="left", fill="x")

    dropdown_arrow = tk.Label(
        dropdown_frame,
        text="▼",
        font=("Arial", 12, "bold"),
        bg="#ffe066",
        fg="#1a1a1a",
        padx=10
    )
    dropdown_arrow.pack(side="right")

    dropdown_label.bind("<Button-1>", toggle_cb)
    dropdown_arrow.bind("<Button-1>", toggle_cb)

    return dropdown_label, dropdown_arrow