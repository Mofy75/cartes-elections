import os
import requests
import json
import config

# --- Fichiers statiques à télécharger ---
STATIC_DOWNLOADS = {
    # GeoJSONs (Secteurs des bureaux de vote - Polygones)
    config.GEOJSON_FILES["2020"]: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/secteurs-des-bureaux-de-vote-en-2020/exports/geojson",
    config.GEOJSON_FILES["2022"]: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/secteurs-des-bureaux-de-vote/exports/geojson",
    config.GEOJSON_FILES["2024"]: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/secteurs-des-bureaux-de-vote-2024/exports/geojson",
    config.GEOJSON_FILES["2026"]: "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/secteurs-des-bureaux-de-vote-2026/exports/geojson",
    
    # Présidentielles 2022
    os.path.join(config.RAW_DIR, "presidentielles_2022_t1.csv"): "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/elections-presidentielles2022-1ertour/exports/csv",
    os.path.join(config.RAW_DIR, "presidentielles_2022_t2.csv"): "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/elections-presidentielles-2022-2emetour/exports/csv",
    
    # Européennes 2024
    os.path.join(config.RAW_DIR, "europeennes_2024.csv"): "https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/elections-europeennes-2024/exports/csv",
    
    # Municipales 2026 (data.gouv.fr)
    os.path.join(config.RAW_DIR, "municipales_2026_t1.csv"): "https://static.data.gouv.fr/resources/elections-municipales-2026-resultats-du-premier-tour/20260316-160625/conseils-darrondissement-paris-lyon-marseille-2026-resultats-bv-par-secteurs-2026-03-16.csv",
    os.path.join(config.RAW_DIR, "municipales_2026_t2.csv"): "https://static.data.gouv.fr/resources/elections-municipales-2026-resultats-du-scond-tour/20260323-180134/conseils-d-39-arrondissement-paris-lyon-marseille-2026-resultats-secteurs-bv-2026-03-23-16h23.csv",
    
    # Candidats Législatives
    os.path.join(config.RAW_DIR, "candidats_legislatives_2022.txt"): "https://static.data.gouv.fr/resources/elections-legislatives-des-12-et-19-juin-2022-liste-des-candidats-du-1er-tour/20220609-195947/livre-des-candidats-et-remplacants-cirlg-t1-france-entiere-2022-06-09-18h58.txt",
    os.path.join(config.RAW_DIR, "candidats_legislatives_2024.csv"): "https://static.data.gouv.fr/resources/liste-des-candidats-aux-elections-legislatives-2024/20240618-224407/candidats-legislatives-2024.csv"
}

# --- Jeux de données Opendatasoft à télécharger via les pièces jointes (attachments) ---
ATTACHMENT_DOWNLOADS = {
    "elections-municipales-2020-1ertour": os.path.join(config.RAW_DIR, "municipales_2020_t1"),
    "elections-municipales-2020-2emetour": os.path.join(config.RAW_DIR, "municipales_2020_t2"),
    "elections-legislatives-2022-1ertour": os.path.join(config.RAW_DIR, "legislatives_2022_t1"),
    "elections-legislatives-2022-2emetour": os.path.join(config.RAW_DIR, "legislatives_2022_t2"),
    "elections-legislatives-2024-1ertour": os.path.join(config.RAW_DIR, "legislatives_2024_t1"),
    "elections-legislatives-2024-2emetour": os.path.join(config.RAW_DIR, "legislatives_2024_t2")
}

def download_file(url, dest_path):
    """Télécharge un fichier avec barre de progression simple et gestion des erreurs."""
    if os.path.exists(dest_path):
        print(f"⏭️  Déjà présent : {os.path.basename(dest_path)}")
        return True
    
    print(f"📥 Téléchargement de {url} -> {dest_path}...")
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers, stream=True)
        response.raise_for_status()
        with open(dest_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
        print(f"✅ Téléchargé : {os.path.basename(dest_path)}")
        return True
    except Exception as e:
        print(f"❌ Erreur lors du téléchargement de {url} : {e}")
        return False

def download_attachments(dataset_id, output_dir):
    """Télécharge toutes les pièces jointes d'un jeu de données Opendatasoft Paris."""
    os.makedirs(output_dir, exist_ok=True)
    
    # Si le dossier contient déjà des fichiers, on suppose que c'est bon
    if len(os.listdir(output_dir)) > 0:
        print(f"⏭️  Déjà téléchargé : pièces jointes pour {dataset_id}")
        return
    
    print(f"🔍 Récupération des métadonnées des pièces jointes pour {dataset_id}...")
    url = f"https://opendata.paris.fr/api/explore/v2.1/catalog/datasets/{dataset_id}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        info = response.json()
        attachments = info.get('attachments', [])
        
        print(f"Found {len(attachments)} attachments for {dataset_id}.")
        for att in attachments:
            filename = att['title']
            download_url = att['url']
            dest = os.path.join(output_dir, filename)
            download_file(download_url, dest)
    except Exception as e:
        print(f"❌ Erreur lors de la récupération des pièces jointes pour {dataset_id} : {e}")

def main():
    print("🚀 Début du téléchargement des données...")
    
    # 1. Télécharger les fichiers statiques
    for dest, url in STATIC_DOWNLOADS.items():
        download_file(url, dest)
        
    # 2. Télécharger les pièces jointes par dossier
    for ds_id, output_dir in ATTACHMENT_DOWNLOADS.items():
        download_attachments(ds_id, output_dir)
        
    print("🎉 Tous les téléchargements terminés.")

if __name__ == "__main__":
    main()
