import os
import subprocess
from mutagen.mp3 import MP3

DOSSIER_RACINE = "oiseaux"

def get_bitrate(path):
    try:
        audio = MP3(path)
        bitrate = audio.info.bitrate // 1000
        print(f"🔍 {os.path.basename(path)} → {bitrate} kbps")
        return bitrate
    except Exception as e:
        print(f"⚠️ Erreur lecture {path}: {e}")
        return None

def reencode_mp3(path):
    print(f"⚙️ Ré-encodage de : {path}")
    temp_path = path + ".tmp.mp3"
    cmd = [
        "ffmpeg", "-y", "-i", path,
        "-b:a", "96k",
        "-compression_level", "0",
        "-c:a", "libmp3lame",
        "-write_xing", "0",
        temp_path
    ]
    result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if os.path.exists(temp_path):
        os.replace(temp_path, path)
        print(f"✅ Ré-encodé et remplacé : {path}")
    else:
        print(f"❌ Échec pour : {path}")
        print("stderr:", result.stderr.decode())

print("📁 Démarrage du scan du dossier :", DOSSIER_RACINE)

for root, _, files in os.walk(DOSSIER_RACINE):
    for file in files:
        if file.endswith(".mp3"):
            full_path = os.path.join(root, file)
            bitrate = get_bitrate(full_path)
            if bitrate is None:
                continue
            if bitrate > 96:
                reencode_mp3(full_path)
            else:
                print(f"↪️ Déjà compressé : {file} ({bitrate} kbps)")

print("✅ Terminé.")
