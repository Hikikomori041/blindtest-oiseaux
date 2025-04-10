@echo off
echo Compilation en cours...

python -m PyInstaller --noconfirm --onefile --windowed ^
--name "Blind-Test Oiseaux" ^
--icon=ressources/images/oiseau.ico ^
blindtest.py

IF EXIST "dist\\Blind-Test Oiseaux.exe" (
    echo Compilation reussie !
    move /Y "dist\\Blind-Test Oiseaux.exe" "Blind-Test Oiseaux.exe" > nul
    echo Nettoyage...
    rmdir /S /Q build
    rmdir /S /Q dist
    del /Q "Blind-Test Oiseaux.spec"
    echo Termine !
) ELSE (
    echo Erreur pendant la compilation. Verifier les chemins et fichiers...
)
