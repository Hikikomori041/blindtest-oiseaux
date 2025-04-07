@echo off
echo Compilation en cours...
python -m PyInstaller --noconfirm --onefile --windowed ^
--name "Blind-Test Oiseaux" ^
--icon=ressources/images/oiseau.ico ^
--add-data "ressources;ressources" ^
Blind-Test.py > dist/compil.log 2>&1

IF EXIST "dist\\Blind-Test Oiseaux.exe" (
    echo Compilation reussie !
) ELSE (
    echo Erreur pendant la compilation. Verifier les chemins et fichiers...
)
