import csv
import json

def convertir_csv_en_json(chemin_csv, chemin_json):
    birds_dict = {}

    with open(chemin_csv, mode='r', encoding='utf-8-sig') as csvfile:
        reader = csv.DictReader(csvfile, delimiter=';')
        for row in reader:
            nom = row['Oiseau']
            birds_dict[nom] = {
                "type": row['Type'],
                "nom_latin": row['Nom latin']
            }

    with open(chemin_json, mode='w', encoding='utf-8') as jsonfile:
        json.dump(birds_dict, jsonfile, indent=2, ensure_ascii=False)

    print(f"Conversion terminée, fichier généré : {chemin_json}")

# Utilisation :
convertir_csv_en_json("oiseaux.csv", "oiseaux.json")
