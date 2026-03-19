import os
import subprocess
from mutagen.mp3 import MP3

# DOSSIER_RACINE = "oiseaux"
DOSSIER_RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "birds"))

def get_bitrate(path):
    try:
        audio = MP3(path)
        bitrate = audio.info.bitrate // 1000
        print(f"🔍 {os.path.basename(path)} → {bitrate} kbps")
        return bitrate
    except Exception as e:
        print(f"⚠️ Erreur lecture {path}: {e}")
        return None

def reencode_or_convert(path, is_wav):
    print(f"⚙️  Traitement de : {path}")
    mp3_path = path[:-4] + ".mp3"
    temp_path = mp3_path + ".tmp.mp3"
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
        os.replace(temp_path, mp3_path)
        print(f"✅ MP3 créé : {mp3_path}")
        if is_wav:
            os.remove(path)
            print(f"🗑️  WAV supprimé : {path}")
    else:
        print(f"❌ Échec pour : {path}")
        print("stderr:", result.stderr.decode())

print("📁 Démarrage du scan du dossier :", DOSSIER_RACINE)

for root, _, files in os.walk(DOSSIER_RACINE):
    for file in files:
        full_path = os.path.join(root, file)

        if file.endswith(".mp3"):
            bitrate = get_bitrate(full_path)
            if bitrate is None:
                continue
            if bitrate > 96:
                reencode_or_convert(full_path, is_wav=False)
            else:
                print(f"↪️  Déjà compressé : {file} ({bitrate} kbps)")

        elif file.endswith(".wav"):
            reencode_or_convert(full_path, is_wav=True)

print("✅ Terminé.")
