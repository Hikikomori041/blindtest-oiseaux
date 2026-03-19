import os
import subprocess
import sys
from mutagen.mp3 import MP3

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(errors="replace")

# DOSSIER_RACINE = "oiseaux"
DOSSIER_RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "birds"))

def get_bitrate(path):
    try:
        audio = MP3(path)
        bitrate = audio.info.bitrate // 1000
        print(f"INFO {os.path.basename(path)} -> {bitrate} kbps")
        return bitrate
    except Exception as e:
        print(f"WARN Read error {path}: {e}")
        return None

def reencode_or_convert(path, is_wav):
    print(f"INFO Processing: {path}")
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
        print(f"OK MP3 created: {mp3_path}")
        if is_wav:
            os.remove(path)
            print(f"OK WAV removed: {path}")
    else:
        print(f"ERROR Failed for: {path}")
        print("stderr:", result.stderr.decode(errors="replace"))

print("INFO Starting folder scan:", DOSSIER_RACINE)

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
                print(f"SKIP Already compressed: {file} ({bitrate} kbps)")

        elif file.endswith(".wav"):
            reencode_or_convert(full_path, is_wav=True)

print("OK Done.")
