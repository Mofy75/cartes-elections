import os
import glob
import json
import re
import unicodedata
import pandas as pd
import numpy as np
import config

# --- MAPPING STATIQUE POUR LES MUNICIPALES 2020 TOUR 2 ---
MUNI_2020_T2_MAPPING = {
    "WEIL Ariel": "PS", "M. WEIL Ariel": "PS",
    "CORDEBARD Alexandra": "PS", "Mme CORDEBARD Alexandra": "PS",
    "TORANIAN Anouch": "PS", "Mme TORANIAN Anouch": "PS",
    "COUMET Jérôme": "PS", "M. COUMET Jérôme": "PS",
    "VAUGLIN François": "PS", "M. VAUGLIN François": "PS",
    "LEJOINDRE Eric": "PS", "M. LEJOINDRE Eric": "PS",
    "PLIEZ Eric": "PS", "M. PLIEZ Eric": "PS",
    "GRÉGOIRE Emmanuel": "PS", "M. GRÉGOIRE Emmanuel": "PS",
    "LEMARDELEY Marie-Christine": "PS", "Mme LEMARDELEY Marie-Christine": "PS",
    "TAÏEB Karen": "PS", "Mme TAÏEB Karen": "PS",
    "PETIT Carine": "PS", "HERVIEU Céline": "PS", "Mme HERVIEU Céline": "PS",
    "DAGNAUD François": "PS", "M. DAGNAUD François": "PS",
    "M. PENG Chang Hua": "PS", "M. POITOUX Guillaume": "PS",
    
    "SZPINER Francis": "LR", "M. SZPINER Francis": "LR",
    "EVREN Agnès": "LR", "Mme EVREN Agnès": "LR",
    "D'HAUTESERRE Jeanne": "LR", "Mme D'HAUTESERRE Jeanne": "LR",
    "BOULARD Geoffroy": "LR", "M. BOULARD Geoffroy": "LR",
    "BERTHOUT Florence": "LR", "Mme BERTHOUT Florence": "LR",
    "LECOQ Jean-Pierre": "LR", "M. LECOQ Jean-Pierre": "LR",
    "CARRERE-GEE Marie-Claire": "LR", "Mme CARRERE-GEE Marie-Claire": "LR",
    "MONTANDON Valérie": "LR", "Mme MONTANDON Valérie": "LR",
    "GRANIER Rudolph": "LR", "M. GRANIER Rudolph": "LR",
    "DIDIER François-Marie": "LR", "M. DIDIER François-Marie": "LR",
    "LÉCUYER Catherine": "LR", "Mme LÉCUYER Catherine": "LR",
    "Garnier Nelly": "LR", "Mme Garnier Nelly": "LR",
    "OLIVIER Jean-Baptiste": "LR", "M. OLIVIER Jean-Baptiste": "LR",
    "MAURIN Pierre": "LR", "M. MAURIN Pierre": "LR",
    "VÉRON Aurélien": "LR", "M. VÉRON Aurélien": "LR",
    "M. FORT Bertil": "LR", "Mme SEGOND Sophie": "LR",
    
    "BUZIN Agnès": "LREM Buzyn", "Mme BUZIN Agnès": "LREM Buzyn",
    "BOURNAZEL Pierre-Yves": "LREM Buzyn", "MAZETIER Sandrine": "LREM Buzyn",
    "Mme MAZETIER Sandrine": "LREM Buzyn", "RUPIN Pacôme": "LREM Buzyn",
    "M. RUPIN Pacôme": "LREM Buzyn", "CALANDRA Frédérique": "LREM Buzyn",
    "Mme CALANDRA Frédérique": "LREM Buzyn", "SEBBAH Hanna": "LREM Buzyn",
    "Mme SEBBAH Hanna": "LREM Buzyn", "AMELLAL Karim": "LREM Buzyn",
    "M. AMELLAL Karim": "LREM Buzyn", "ROUXEL Olivier": "LREM Buzyn",
    "M. ROUXEL Olivier": "LREM Buzyn", "NGATCHA Arnaud": "LREM Buzyn",
    "M. NGATCHA Arnaud": "LREM Buzyn", "IBLED Catherine": "LREM Buzyn",
    "Mme IBLED Catherine": "LREM Buzyn", "AZIERE Éric": "LREM Buzyn",
    "M. AZIERE Éric": "LREM Buzyn", "GANTZER Gaspard": "LREM Buzyn",
    "M. GANTZER Gaspard": "LREM Buzyn", "Mme TOUBIANA Marie": "LREM Buzyn",
    "Mme BURKLI Delphine": "LREM Buzyn", "Mme BÜRKLI Delphine": "LREM Buzyn",
    
    "VILLANI Cédric": "LREM Villani", "M. VILLANI Cédric": "LREM Villani",
    "SIMONNET Danielle": "LFI", "Mme SIMONNET Danielle": "LFI"
}

# --- MAPPING STATIQUE POUR LES EUROPÉENNES 2024 ---
EURO_2024_MAPPING = {
    "bardella_jordan": "RN",
    "hayer_valerie": "ENS",
    "glucksmann_raphael": "UG",
    "aubry_manon": "LFI",
    "bellamy_francois_xavier": "LR",
    "toussaint_marie": "VEC",
    "marechal_marion": "REC",
    "deffontaines_leon": "EXG",
    "asselineau_francois": "DIV",
    "philippot_florian": "DSV",
    "thouy_helene": "ECO",
    "lassalle_jean": "DIV",
    "arthaud_nathalie": "EXG",
    "larrouturou_pierre": "DVG",
    "labib_selma": "EXG"
}

def normalize_name(text):
    if not isinstance(text, str):
        return ""
    text = text.strip().upper()
    text = "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')
    text = re.sub(r'[^A-Z\s\-]', '', text)
    return text

def format_id_bv(arr, bv):
    """Formate id_bv comme '15-12' (sans zéros inutiles pour l'arrondissement)."""
    try:
        arr_int = int(arr)
        bv_int = int(bv)
        return f"{arr_int}-{bv_int}"
    except:
        return f"{arr}-{bv}"

def get_top3_and_winner(votes_dict, exprimes, id_bv):
    """Calcule le parti gagnant, sa couleur, et le tooltip HTML pour le Top 3."""
    if not votes_dict or exprimes <= 0:
        return "N/A", 0.0, "#808080", f"<b>Bureau :</b> {id_bv}<br>Pas de voix exprimées"
    
    # Trier par nombre de voix descendant
    sorted_votes = sorted(votes_dict.items(), key=lambda x: x[1], reverse=True)
    winner_party, winner_votes = sorted_votes[0]
    winner_score = (winner_votes / exprimes) * 100
    winner_color = config.COULEURS_NUANCES.get(winner_party, "#808080")
    
    tooltip_html = f"<b>Bureau :</b> {id_bv}<br><hr>"
    for party, votes in sorted_votes[:3]:
        pct = (votes / exprimes) * 100
        readable_party = config.NOMS_NUANCES.get(party, party)
        votes_str = f"{votes:,}".replace(",", " ")
        tooltip_html += f"{readable_party} : {pct:.1f} % ({votes_str} voix)<br>"
        
    return winner_party, winner_score, winner_color, tooltip_html

def load_legislatives_candidates(year):
    """Charge la liste des candidats de data.gouv.fr pour les législatives et retourne un dictionnaire."""
    cand_map = {}
    if year == 2024:
        path = os.path.join(config.RAW_DIR, "candidats_legislatives_2024.csv")
        df = pd.read_csv(path)
        df['CodDpt'] = df['CodDpt'].astype(str).str.zfill(2)
        df_paris = df[df['CodDpt'] == '75']
        for _, r in df_paris.iterrows():
            last = normalize_name(r['NomPsn'])
            first = normalize_name(r['PrenomPsn'])
            cand_map[(last, first)] = r['CodNuaCand']
    elif year == 2022:
        path = os.path.join(config.RAW_DIR, "candidats_legislatives_2022.txt")
        df = pd.read_csv(path, sep='\t', encoding='latin-1')
        df.columns = [normalize_name(c) for c in df.columns]
        dpt_col = [c for c in df.columns if "DEPARTEMENT" in c][0]
        df[dpt_col] = df[dpt_col].astype(str).str.zfill(2)
        df_paris = df[df[dpt_col] == '75']
        
        last_col = [c for c in df.columns if "NOM" in c and "REMPLA" not in c][0]
        first_col = [c for c in df.columns if "PRENOM" in c or "PRNOM" in c][0]
        nuance_col = [c for c in df.columns if "NUANCE" in c][0]
        
        for _, r in df_paris.iterrows():
            last = normalize_name(r[last_col])
            first = normalize_name(r[first_col])
            cand_map[(last, first)] = r[nuance_col]
            
    return cand_map

def match_candidate_to_nuance(col_name, cand_map):
    """Associe un nom de colonne de candidat à sa nuance officielle."""
    norm_col = normalize_name(col_name)
    # Correction spécifique pour le nom corrompu de Sylvain Maillard en 2024
    if "LARD" in norm_col and "SYLVAIN" in norm_col:
        return "ENS"
    # Chercher une correspondance exacte (nom et prénom tous deux inclus dans le nom de la colonne)
    matched_nuance = None
    for (last, first), nuance in cand_map.items():
        if last in norm_col and first in norm_col:
            # En cas de match multiple, on prend le premier ou affine
            matched_nuance = nuance
            break
            
    if not matched_nuance:
        # Correspondances manuelles (fallbacks)
        if "LFI" in norm_col or "MELENCHON" in norm_col: return "LFI"
        if "RENAISSANCE" in norm_col or "LREM" in norm_col or "MACRON" in norm_col: return "ENS"
        if "RN" in norm_col or "LE PEN" in norm_col: return "RN"
        if "REPUBLICAINS" in norm_col: return "LR"
        if "SOCIALISTE" in norm_col or "PS " in norm_col: return "PS"
        if "EELV" in norm_col or "ECOLOGISTE" in norm_col: return "VEC"
        return "DIV"
        
    return matched_nuance

def save_processed_json(records, election_id):
    """Enregistre la liste de dictionnaires sous forme de JSON propre."""
    dest = os.path.join(config.PROCESSED_DIR, f"{election_id}.json")
    with open(dest, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print(f"💾 Processed JSON sauvegardé : {dest} ({len(records)} bureaux)")

# =============================================================================
# --- FONCTIONS DE TRAITEMENT PAR ÉLECTION ---
# =============================================================================

def process_municipales_2020_t1():
    print("⚙️  Traitement Municipales 2020 Tour 1...")
    # Lire directement Tous_arr.xlsx
    df = pd.read_excel(os.path.join(config.DATA_DIR, "elections_2020", "Tous_arr.xlsx"))
    records = []
    
    party_cols = {
        "(EELV)": "VEC",
        "(LREM Buzyn)": "LREM Buzyn",
        "(LR)": "LR",
        "(PS)": "PS",
        "(LREM Villani)": "LREM Villani",
        "LFI": "LFI"
    }
    
    for _, row in df.iterrows():
        arr = row["NUM_ARROND"]
        bv = row["NUM_BUREAU"]
        id_bv = format_id_bv(arr, bv)
        
        inscrits = int(row["NB_INSCR"])
        votants = int(row["NB_VOTANT"])
        exprimes = int(row["NB_EXPRIM"])
        blancs = int(row["NB_BLANC"])
        nuls = int(row["NB_NUL"])
        
        votes = {}
        proportions = {}
        for col_name, party in party_cols.items():
            v = int(row[col_name])
            votes[party] = v
            proportions[party] = (v / exprimes * 100) if exprimes > 0 else 0.0
            
        winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
        
        records.append({
            "id_bv": id_bv,
            "arrondissement": int(arr),
            "num_bureau": int(bv),
            "inscrits": inscrits,
            "votants": votants,
            "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
            "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
            "blancs": blancs,
            "nuls": nuls,
            "exprimes": exprimes,
            "votes": votes,
            "proportions": proportions,
            "winner_party": winner_party,
            "winner_score": winner_score,
            "winner_color": winner_color,
            "top3_html": top3_html
        })
        
    save_processed_json(records, "municipales_2020_t1")

def process_municipales_2020_t2():
    print("⚙️  Traitement Municipales 2020 Tour 2...")
    files = glob.glob(os.path.join(config.RAW_DIR, "municipales_2020_t2", "*.xls"))
    records = []
    
    for f in files:
        df = pd.read_excel(f)
        candidate_cols = df.columns[16:]
        
        for _, row in df.iterrows():
            arr = row["NUM_ARROND"]
            bv = row["NUM_BUREAU"]
            id_bv = format_id_bv(arr, bv)
            
            inscrits = int(row["NB_INSCR"])
            votants = int(row["NB_VOTANT"])
            exprimes = int(row["NB_EXPRIM"])
            blancs = int(row["NB_BLANC"])
            nuls = int(row["NB_NUL"])
            
            votes = {}
            for col in candidate_cols:
                cand_name = col.strip()
                party = MUNI_2020_T2_MAPPING.get(cand_name, "DIV")
                val = int(row[col])
                votes[party] = votes.get(party, 0) + val
                
            proportions = {}
            for party, val in votes.items():
                proportions[party] = (val / exprimes * 100) if exprimes > 0 else 0.0
                
            winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
            
            records.append({
                "id_bv": id_bv,
                "arrondissement": int(arr),
                "num_bureau": int(bv),
                "inscrits": inscrits,
                "votants": votants,
                "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
                "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
                "blancs": blancs,
                "nuls": nuls,
                "exprimes": exprimes,
                "votes": votes,
                "proportions": proportions,
                "winner_party": winner_party,
                "winner_score": winner_score,
                "winner_color": winner_color,
                "top3_html": top3_html
            })
            
    save_processed_json(records, "municipales_2020_t2")

def process_presidentielles_2022(tour):
    print(f"⚙️  Traitement Présidentielles 2022 Tour {tour}...")
    filename = f"presidentielles_2022_t{tour}.csv"
    path = os.path.join(config.RAW_DIR, filename)
    
    # Détecter le délimiteur (généralement ';' ou ',' dans les exports Opendatasoft)
    df = pd.read_csv(path, sep=None, engine='python', encoding='utf-8-sig')
    records = []
    
    # Colonnes candidats
    candidate_cols = []
    if tour == 1:
        candidate_cols = list(config.PRESIDENTIELLE_2022_CANDIDATS.keys())
    else:
        candidate_cols = ["macron_emmanuel", "le_pen_marine"]
        
    for _, row in df.iterrows():
        id_bv = row["id_bvote"]
        arr = row["arr_bv"]
        bv = row["num_bureau"]
        
        inscrits = int(row["nb_inscrit"])
        votants = int(row["nb_votant"])
        exprimes = int(row["nb_exprime"])
        blancs = int(row["nb_vote_blanc"])
        nuls = int(row["nb_vote_nul"])
        
        votes = {}
        for cand in candidate_cols:
            party = "RN" if cand == "le_pen_marine" else ("ENS" if cand == "macron_emmanuel" else config.PRESIDENTIELLE_2022_CANDIDATS[cand])
            val = int(row[cand])
            votes[party] = votes.get(party, 0) + val
            
        proportions = {}
        for party, val in votes.items():
            proportions[party] = (val / exprimes * 100) if exprimes > 0 else 0.0
            
        winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
        
        records.append({
            "id_bv": id_bv,
            "arrondissement": int(arr),
            "num_bureau": int(bv),
            "inscrits": inscrits,
            "votants": votants,
            "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
            "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
            "blancs": blancs,
            "nuls": nuls,
            "exprimes": exprimes,
            "votes": votes,
            "proportions": proportions,
            "winner_party": winner_party,
            "winner_score": winner_score,
            "winner_color": winner_color,
            "top3_html": top3_html
        })
        
    save_processed_json(records, f"presidentielles_2022_t{tour}")

def process_legislatives(year, tour):
    print(f"⚙️  Traitement Législatives {year} Tour {tour}...")
    folder = os.path.join(config.RAW_DIR, f"legislatives_{year}_t{tour}")
    files = glob.glob(os.path.join(folder, "*.xlsx"))
    
    cand_map = load_legislatives_candidates(year)
    records = []
    
    for f in files:
        df = pd.read_excel(f)
        candidate_cols = df.columns[16:]
        
        # Mapper les colonnes aux nuances
        col_to_nuance = {}
        for col in candidate_cols:
            col_to_nuance[col] = match_candidate_to_nuance(col, cand_map)
            
        for _, row in df.iterrows():
            id_bv = row["ID_BVOTE"]
            arr = row["NUM_ARROND"]
            bv = row["NUM_BUREAU"]
            
            inscrits = int(row["NB_INSCR"])
            votants = int(row["NB_VOTANT"])
            exprimes = int(row["NB_EXPRIM"])
            blancs = int(row["NB_BLANC"])
            nuls = int(row["NB_NUL"])
            
            votes = {}
            for col in candidate_cols:
                party = col_to_nuance[col]
                val = int(row[col])
                votes[party] = votes.get(party, 0) + val
                
            proportions = {}
            for party, val in votes.items():
                proportions[party] = (val / exprimes * 100) if exprimes > 0 else 0.0
                
            winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
            
            records.append({
                "id_bv": id_bv,
                "arrondissement": int(arr),
                "num_bureau": int(bv),
                "inscrits": inscrits,
                "votants": votants,
                "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
                "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
                "blancs": blancs,
                "nuls": nuls,
                "exprimes": exprimes,
                "votes": votes,
                "proportions": proportions,
                "winner_party": winner_party,
                "winner_score": winner_score,
                "winner_color": winner_color,
                "top3_html": top3_html
            })
            
    save_processed_json(records, f"legislatives_{year}_t{tour}")

def process_europeennes_2024():
    print("⚙️  Traitement Européennes 2024...")
    path = os.path.join(config.RAW_DIR, "europeennes_2024.csv")
    df = pd.read_csv(path, sep=None, engine='python', encoding='utf-8-sig')
    records = []
    
    candidate_cols = list(EURO_2024_MAPPING.keys())
    
    for _, row in df.iterrows():
        id_bv = row["id_bv"]
        arr = row["num_arrond"]
        bv = row["num_bureau"]
        
        inscrits = int(row["nb_inscr"])
        votants = int(row["nb_votant"])
        exprimes = int(row["nb_exprim"])
        blancs = int(row["nb_bl"])
        nuls = int(row["nb_nul"])
        
        votes = {}
        for cand in candidate_cols:
            party = EURO_2024_MAPPING[cand]
            val = int(row[cand])
            votes[party] = votes.get(party, 0) + val
            
        proportions = {}
        for party, val in votes.items():
            proportions[party] = (val / exprimes * 100) if exprimes > 0 else 0.0
            
        winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
        
        records.append({
            "id_bv": id_bv,
            "arrondissement": int(arr),
            "num_bureau": int(bv),
            "inscrits": inscrits,
            "votants": votants,
            "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
            "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
            "blancs": blancs,
            "nuls": nuls,
            "exprimes": exprimes,
            "votes": votes,
            "proportions": proportions,
            "winner_party": winner_party,
            "winner_score": winner_score,
            "winner_color": winner_color,
            "top3_html": top3_html
        })
        
    save_processed_json(records, "europeennes_2024")

def process_municipales_2026(tour):
    print(f"⚙️  Traitement Municipales 2026 Tour {tour}...")
    filename = f"municipales_2026_t{tour}.csv"
    path = os.path.join(config.RAW_DIR, filename)
    
    df = pd.read_csv(path, sep=';')
    # Filtrer Paris (dpt 75)
    df['Code département'] = df['Code département'].astype(str)
    df_paris = df[df['Code département'].str.startswith('75') | (df['Code département'] == '75')]
    
    records = []
    
    for _, row in df_paris.iterrows():
        # Reconstruire id_bv à partir de Code BV
        code_bv = int(row['Code BV'])
        arr = code_bv // 100
        bv = code_bv % 100
        id_bv = f"{arr}-{bv}"
        
        inscrits = int(row['Inscrits'])
        votants = int(row['Votants'])
        exprimes = int(row['Exprimés'])
        blancs = int(row['Blancs'])
        nuls = int(row['Nuls'])
        
        # Parcourir les listes candidates (jusqu'à 11 listes dans le CSV)
        votes = {}
        for i in range(1, 12):
            nuance_col = f"Nuance liste {i}"
            voix_col = f"Voix {i}"
            if nuance_col in row and pd.notna(row[nuance_col]):
                party = str(row[nuance_col]).strip()
                val = int(row[voix_col])
                votes[party] = votes.get(party, 0) + val
                
        proportions = {}
        for party, val in votes.items():
            proportions[party] = (val / exprimes * 100) if exprimes > 0 else 0.0
            
        winner_party, winner_score, winner_color, top3_html = get_top3_and_winner(votes, exprimes, id_bv)
        
        records.append({
            "id_bv": id_bv,
            "arrondissement": int(arr),
            "num_bureau": int(bv),
            "inscrits": inscrits,
            "votants": votants,
            "participation": (votants / inscrits * 100) if inscrits > 0 else 0.0,
            "abstention": (1 - votants / inscrits) * 100 if inscrits > 0 else 0.0,
            "blancs": blancs,
            "nuls": nuls,
            "exprimes": exprimes,
            "votes": votes,
            "proportions": proportions,
            "winner_party": winner_party,
            "winner_score": winner_score,
            "winner_color": winner_color,
            "top3_html": top3_html
        })
        
    save_processed_json(records, f"municipales_2026_t{tour}")

def main():
    print("🚀 Début du traitement des données...")
    
    # 2020
    process_municipales_2020_t1()
    process_municipales_2020_t2()
    
    # 2022
    process_presidentielles_2022(1)
    process_presidentielles_2022(2)
    process_legislatives(2022, 1)
    process_legislatives(2022, 2)
    
    # 2024
    process_europeennes_2024()
    process_legislatives(2024, 1)
    process_legislatives(2024, 2)
    
    # 2026
    process_municipales_2026(1)
    process_municipales_2026(2)
    
    # Génération du fichier JS de statistiques locales pour éviter le CORS
    generate_stats_js()
    
    print("🎉 Tous les traitements terminés avec succès.")

def generate_stats_js():
    print("⚙️  Génération de docs/stats_data.js pour contourner les blocages CORS locaux...")
    stats_data = {}
    processed_files = glob.glob(os.path.join(config.PROCESSED_DIR, "*.json"))
    for path in processed_files:
        filename = os.path.basename(path)
        election_id = filename.replace(".json", "")
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        total_inscrits = 0
        total_votants = 0
        total_exprimes = 0
        party_votes = {}
        for bv in data:
            total_inscrits += bv.get("inscrits", 0)
            total_votants += bv.get("votants", 0)
            total_exprimes += bv.get("exprimes", 0)
            if bv.get("votes"):
                for p, v in bv.get("votes").items():
                    party_votes[p] = party_votes.get(p, 0) + v
                    
        turnout_rate = (total_votants / total_inscrits * 100) if total_inscrits > 0 else 0.0
        sorted_parties = sorted(
            [{"party": p, "votes": v, "pct": (v / total_exprimes * 100) if total_exprimes > 0 else 0.0} for p, v in party_votes.items()],
            key=lambda x: x["votes"],
            reverse=True
        )
        
        stats_data[election_id] = {
            "totalInscrits": total_inscrits,
            "totalVotants": total_votants,
            "totalExprimes": total_exprimes,
            "turnoutRate": turnout_rate,
            "parties": sorted_parties
        }
        
    js_content = f"// Fichier généré automatiquement pour éviter les blocages CORS du protocole file:// dans les navigateurs.\nconst ELECTION_STATS = {json.dumps(stats_data, ensure_ascii=False, indent=2)};\n"
    with open("docs/stats_data.js", "w", encoding="utf-8") as f:
        f.write(js_content)
    print("💾 Fichier docs/stats_data.js écrit avec succès !")


if __name__ == "__main__":
    main()
