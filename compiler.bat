@echo off
echo Compilation en cours...

python -m PyInstaller --noconfirm --onefile --windowed ^
--name "Blind-Test Oiseaux" ^
--icon=ressources/images/oiseau.ico ^
--add-data "ressources;ressources" ^
@REM --add-data "Blind-Test Oiseaux.py;." ^
--add-data "dist\\Blind-Test Oiseaux.exe;."
Menu_BlindTest.py

IF EXIST "dist\\Blind-Test Oiseaux.exe" (
    echo Compilation reussie !
) ELSE (
    echo Erreur pendant la compilation. Verifier les chemins et fichiers...
)
