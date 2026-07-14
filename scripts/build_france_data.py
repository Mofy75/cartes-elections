import os
import requests
import csv
import json

# URLs des données officielles de data.gouv.fr (niveau communes)
URLS = {
    "pres_2022_t1": "https://static.data.gouv.fr/resources/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-1er-tour/20220414-152459/resultats-par-niveau-subcom-t1-france-entiere.txt",
    "pres_2022_t2": "https://static.data.gouv.fr/resources/election-presidentielle-des-10-et-24-avril-2022-resultats-definitifs-du-2nd-tour/20220428-142333/resultats-par-niveau-subcom-t2-france-entiere.txt",
    "euro_2024": "https://static.data.gouv.fr/resources/resultats-des-elections-europeennes-du-9-juin-2024/20240613-154634/resultats-definitifs-par-commune.csv"
}

# Cartographie des candidats 2022 aux nuances standardisées pour correspondre aux partis
MAPPING_PRES_2022 = {
    "MACRON": "ENS",
    "LE PEN": "RN",
    "MÉLENCHON": "LFI",
    "ZEMMOUR": "REC",
    "PÉCRESSE": "LR",
    "JADOT": "VEC",
    "ROUSSEL": "PCF",
    "HIDALGO": "PS",
    "LASSALLE": "DVD",
    "DUPONT-AIGNAN": "DSV",
    "POUTOU": "NPA",
    "ARTHAUD": "LO"
}

# Liste des nuances européennes majeures à conserver (> 1% au niveau national)
EURO_MAJORS = {"LRN", "LENS", "LUG", "LFI", "LLR", "LVEC", "LREC", "LCOM"}

def download_file(url, local_path):
    if os.path.exists(local_path):
        print(f"ℹ️  Fichier déjà en local : {local_path}")
        return
    print(f"📥 Téléchargement de {url}...")
    r = requests.get(url)
    r.raise_for_status()
    # Sauvegarder sous encodage brut
    with open(local_path, "wb") as f:
        f.write(r.content)
    print(f"💾 Sauvegardé : {local_path}")

def main():
    print("🚀 Début du traitement des données France entière par commune...")
    os.makedirs("data/raw", exist_ok=True)
    
    # 1. Télécharger les fichiers sources
    download_file(URLS["pres_2022_t1"], "data/raw/pres_2022_t1.txt")
    download_file(URLS["pres_2022_t2"], "data/raw/pres_2022_t2.txt")
    download_file(URLS["euro_2024"], "data/raw/euro_2024.csv")
    
    france_data = {}

    # 2. Parser la Présidentielle 2022 Tour 1
    print("⏳ Analyse Présidentielle 2022 Tour 1...")
    with open("data/raw/pres_2022_t1.txt", "r", encoding="latin1") as f:
        reader = csv.reader(f, delimiter=";")
        headers = next(reader)
        for row in reader:
            if not row:
                continue
            dep_code = row[0].strip().zfill(2)
            com_code = row[2].strip().zfill(3)
            # Gestion code INSEE
            if len(dep_code) == 3:
                insee = dep_code + com_code[-2:]
            else:
                insee = dep_code + com_code
            
            com_name = row[3].strip()
            inscrits = int(row[5])
            votants = int(row[8])
            exprimes = int(row[16])
            
            # Extraire les voix par candidat
            votes = {}
            col_idx = 19
            while col_idx < len(row):
                c_nom = row[col_idx + 2].strip()
                c_voix = int(row[col_idx + 4])
                nuance = MAPPING_PRES_2022.get(c_nom, "Autre")
                votes[nuance] = votes.get(nuance, 0) + c_voix
                col_idx += 7
                
            france_data[insee] = {
                "n": com_name,
                "d": dep_code,
                "p1": {
                    "i": inscrits,
                    "v": votants,
                    "e": exprimes,
                    "vt": votes
                }
            }

    # 3. Parser la Présidentielle 2022 Tour 2
    print("⏳ Analyse Présidentielle 2022 Tour 2...")
    with open("data/raw/pres_2022_t2.txt", "r", encoding="latin1") as f:
        reader = csv.reader(f, delimiter=";")
        headers = next(reader)
        for row in reader:
            if not row:
                continue
            dep_code = row[0].strip().zfill(2)
            com_code = row[2].strip().zfill(3)
            if len(dep_code) == 3:
                insee = dep_code + com_code[-2:]
            else:
                insee = dep_code + com_code
                
            if insee not in france_data:
                continue
                
            inscrits = int(row[5])
            votants = int(row[8])
            exprimes = int(row[16])
            
            votes = {}
            col_idx = 19
            while col_idx < len(row):
                c_nom = row[col_idx + 2].strip()
                c_voix = int(row[col_idx + 4])
                nuance = MAPPING_PRES_2022.get(c_nom, "Autre")
                votes[nuance] = votes.get(nuance, 0) + c_voix
                col_idx += 7
                
            france_data[insee]["p2"] = {
                "i": inscrits,
                "v": votants,
                "e": exprimes,
                "vt": votes
            }

    # 4. Parser les Européennes 2024
    print("⏳ Analyse Européennes 2024...")
    with open("data/raw/euro_2024.csv", "r", encoding="latin1") as f:
        reader = csv.reader(f, delimiter=";")
        headers = next(reader)
        for row in reader:
            if not row:
                continue
            insee = row[2].strip('"\n ').zfill(5)
            if insee not in france_data:
                # Créer la fiche de la commune si elle n'existait pas en 2022
                france_data[insee] = {
                    "n": row[3].strip('"\n '),
                    "d": row[0].strip('"\n ').zfill(2)
                }
                
            inscrits = int(row[4])
            votants = int(row[5])
            exprimes = int(row[9])
            
            votes = {}
            col_idx = 18 # Index du premier candidat
            while col_idx < len(row):
                c_nuance = row[col_idx + 1].strip('"\n ')
                c_voix = int(row[col_idx + 4])
                
                # Conserver uniquement les listes majeures pour optimiser la taille du fichier
                if c_nuance in EURO_MAJORS:
                    votes[c_nuance] = votes.get(c_nuance, 0) + c_voix
                else:
                    votes["Autre"] = votes.get("Autre", 0) + c_voix
                col_idx += 8
                
            france_data[insee]["eu"] = {
                "i": inscrits,
                "v": votants,
                "e": exprimes,
                "vt": votes
            }

    # 5. Écrire le fichier final sous forme de script JS (mode compact)
    output_path = "docs/france_stats_data.js"
    print(f"⚙️  Écriture de {output_path}...")
    
    js_content = f"// Base de données des communes françaises pour le module France Vote\nconst FRANCE_STATS = {json.dumps(france_data, ensure_ascii=False, separators=(',', ':'))};\n"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"🎉 Terminé avec succès ! Fichier écrit : {output_path}")

if __name__ == "__main__":
    main()
