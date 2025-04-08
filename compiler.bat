@echo off
echo Compilation en cours...

@REM python -m PyInstaller --noconfirm --onefile --windowed ^
@REM --name "Blind-Test Oiseaux" ^
@REM --icon=ressources/images/oiseau.ico ^
@REM --add-data "ressources;ressources" ^
@REM @REM --add-data "Blind-Test Oiseaux.py;." ^
@REM --add-data "dist\\Blind-Test Oiseaux.exe;."
@REM menu.py

pyinstaller --noconfirm --onefile --windowed ^
--name "Blind-Test Oiseaux" ^
--icon=ressources/images/oiseau.ico ^
--add-data "ressources;ressources" ^
Init.py



IF EXIST "dist\\Blind-Test Oiseaux.exe" (
    echo Compilation reussie !
) ELSE (
    echo Erreur pendant la compilation. Verifier les chemins et fichiers...
)
