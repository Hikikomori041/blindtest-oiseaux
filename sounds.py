import os
# Désactive le message d'accueil de pygame
os.environ['PYGAME_HIDE_SUPPORT_PROMPT'] = "hide"
import pygame
from mutagen.mp3 import MP3

pygame.mixer.init()

def play_sound(path):
    pygame.mixer.music.load(path)
    pygame.mixer.music.play()
    audio = MP3(path)
    return int(audio.info.length)

def stop_sound():
    pygame.mixer.music.stop()

def pause_sound():
    pygame.mixer.music.pause()

def unpause_sound():
    pygame.mixer.music.unpause()

def is_playing():
    return pygame.mixer.music.get_busy()

def play_feedback(sound_path, volume=1.0):
    sound = pygame.mixer.Sound(sound_path)
    sound.set_volume(volume)
    sound.play()
