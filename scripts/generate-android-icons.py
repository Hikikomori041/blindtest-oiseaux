"""Génère les icônes et l'écran de démarrage Android à partir de assets/images/oiseau.png.

À relancer seulement si l'icône change :  python scripts/generate-android-icons.py
(nécessite Pillow : python -m pip install --user pillow)

- ic_launcher.png        : icône classique (l'image telle quelle)
- ic_launcher_round.png  : version ronde (oiseau blanc sur disque rouge)
- ic_launcher_foreground : oiseau blanc détouré pour l'icône adaptative (fond rouge = ic_launcher_background)
- splash.png             : fond sombre de l'appli + icône au centre
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'assets' / 'images' / 'oiseau.png'
RES = ROOT / 'android' / 'app' / 'src' / 'main' / 'res'

RED = (237, 53, 37, 255)          # rouge de l'icône (aussi dans values/ic_launcher_background.xml)
DARK = (43, 57, 80, 255)          # #2B3950 (values/colors.xml : appBackground)
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}


def extract_bird(icon):
    """Oiseau blanc sur transparent : l'opacité suit la « blancheur » du pixel (bords lissés, œil évidé)."""
    bird = Image.new('RGBA', icon.size, (255, 255, 255, 0))
    src, dst = icon.load(), bird.load()
    for y in range(icon.height):
        for x in range(icon.width):
            r, g, b, a = src[x, y]
            whiteness = max(0.0, (min(r, g, b) - 40) / (255 - 40))
            dst[x, y] = (255, 255, 255, int(255 * whiteness * a / 255))
    return bird.crop(bird.getbbox())


def centered(image, canvas_size, ratio, background=(0, 0, 0, 0)):
    """Place l'image au centre d'un carré, sa plus grande dimension valant ratio × la taille du carré."""
    canvas = Image.new('RGBA', (canvas_size, canvas_size), background)
    scale = canvas_size * ratio / max(image.size)
    resized = image.resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(resized, ((canvas_size - resized.width) // 2, (canvas_size - resized.height) // 2))
    return canvas


def main():
    icon = Image.open(SOURCE).convert('RGBA')
    bird = extract_bird(icon)

    for density, factor in DENSITIES.items():
        folder = RES / f'mipmap-{density}'
        launcher = round(48 * factor)
        icon.resize((launcher, launcher), Image.LANCZOS).save(folder / 'ic_launcher.png')

        # Rond : disque rouge + oiseau (suréchantillonné pour un bord lisse)
        big = launcher * 4
        disc = Image.new('RGBA', (big, big), (0, 0, 0, 0))
        ImageDraw.Draw(disc).ellipse((0, 0, big - 1, big - 1), fill=RED)
        disc.alpha_composite(centered(bird, big, 0.62))
        disc.resize((launcher, launcher), Image.LANCZOS).save(folder / 'ic_launcher_round.png')

        # Adaptative : 108 dp, zone toujours visible = 66 dp au centre
        centered(bird, round(108 * factor), 0.5).save(folder / 'ic_launcher_foreground.png')

    # Écrans de démarrage : on garde les dimensions des fichiers existants
    for splash in RES.glob('drawable*/splash.png'):
        width, height = Image.open(splash).size
        canvas = Image.new('RGBA', (width, height), DARK)
        logo_size = round(min(width, height) * 0.3)
        logo = icon.resize((logo_size, logo_size), Image.LANCZOS)
        canvas.alpha_composite(logo, ((width - logo_size) // 2, (height - logo_size) // 2))
        canvas.convert('RGB').save(splash)

    print('Icones et ecrans de demarrage Android generes')


if __name__ == '__main__':
    main()
