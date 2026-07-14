import os

# --- Répertoires du projet ---
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
RAW_DIR = os.path.join(DATA_DIR, "raw")
PROCESSED_DIR = os.path.join(DATA_DIR, "processed")
GEOJSON_DIR = os.path.join(DATA_DIR, "geojson")
OUTPUT_DIR = os.path.join(BASE_DIR, "docs", "outputs")

# S'assurer que les répertoires existent
for d in [RAW_DIR, PROCESSED_DIR, GEOJSON_DIR, OUTPUT_DIR]:
    os.makedirs(d, exist_ok=True)

# --- Fichiers Géographiques (GeoJSON) ---
GEOJSON_FILES = {
    "2020": os.path.join(GEOJSON_DIR, "bureaux_2020.geojson"),
    "2022": os.path.join(GEOJSON_DIR, "bureaux_2022.geojson"),
    "2024": os.path.join(GEOJSON_DIR, "bureaux_2024.geojson"),
    "2026": os.path.join(GEOJSON_DIR, "bureaux_2026.geojson")
}

# --- Couleurs des nuances politiques (Standard national) ---
COULEURS_NUANCES = {
    # Gauche / Extrême Gauche
    "EXG": "#9b0000",      # Extrême gauche (LO, NPA...)
    "DXG": "#9b0000",      # Divers Extrême gauche
    "LFI": "#cc2443",      # La France Insoumise
    "FI": "#cc2443",       # France Insoumise (2022)
    "NUP": "#cc2443",      # NUPES (2022)
    "UG": "#E40046",       # Union de la Gauche (NFP en 2024...)
    "SOC": "#E40046",      # Socialiste
    "PS": "#E40046",       # Parti Socialiste
    "RDG": "#ff7400",      # Radicaux de Gauche
    "DVG": "#ff80a0",      # Divers gauche
    "VEC": "#00a650",      # Les écologistes (EELV...)
    "EELV": "#00a650",     # Europe Écologie Les Verts
    "ECO": "#00a650",      # Écologistes
    
    # Centre
    "ENS": "#ffc20e",      # Ensemble (Renaissance, LREM, MoDem...)
    "LREM": "#ffc20e",     # LREM
    "RE": "#ffc20e",       # Renaissance
    "ALLI": "#ffcc00",     # Alliance Centriste
    "UDI": "#00d2ff",      # UDI
    "UC": "#00d2ff",       # Union du Centre
    "DVC": "#ffeb80",      # Divers centre
    
    # Droite / Extrême Droite
    "LR": "#0066cc",       # Les Républicains
    "DVD": "#80c0ff",      # Divers droite
    "DSV": "#4080ff",      # Droite souverainiste (DLF, LP...)
    "REC": "#8a2be2",      # Reconquête
    "RN": "#002e66",       # Rassemblement National
    "EXD": "#000020",      # Extrême droite
    "DXD": "#000020",      # Divers Extrême droite
    
    # Divers / Autres
    "DIV": "#808080",      # Divers
    "REG": "#c0c0c0",      # Régionalistes
    "SE": "#808080",       # Sans étiquette
    "UNC": "#808080",      # Inconnu
    "N/A": "#808080"
}

# Mapping des candidats aux nuances (Présidentielles 2022)
PRESIDENTIELLE_2022_CANDIDATS = {
    "arthaud_nathalie": "EXG",
    "poutou_philippe": "EXG",
    "roussel_fabien": "EXG",
    "melenchon_jean_luc": "LFI",
    "jadot_yannick": "VEC",
    "hidalgo_anne": "PS",
    "macron_emmanuel": "ENS",
    "pecresse_valerie": "LR",
    "dupont_aignan_nicolas": "DSV",
    "lassalle_jean": "DIV",
    "zemmour_eric": "REC",
    "le_pen_marine": "RN"
}

# Noms lisibles pour les nuances
NOMS_NUANCES = {
    "EXG": "Extrême gauche",
    "DXG": "Extrême gauche",
    "LFI": "La France Insoumise",
    "FI": "La France Insoumise",
    "NUP": "NUPES",
    "UG": "Union de la Gauche / NFP",
    "SOC": "Parti Socialiste",
    "PS": "Parti Socialiste",
    "RDG": "Parti Radical de Gauche",
    "DVG": "Divers gauche",
    "VEC": "Les Écologistes / EELV",
    "EELV": "Europe Écologie Les Verts",
    "ECO": "Écologistes",
    "ENS": "Ensemble (Majorité Pres.)",
    "LREM": "La République En Marche",
    "RE": "Renaissance",
    "UDI": "UDI",
    "UC": "Union du Centre",
    "DVC": "Divers centre",
    "LR": "Les Républicains",
    "DVD": "Divers droite",
    "DSV": "Droite souverainiste",
    "REC": "Reconquête!",
    "RN": "Rassemblement National",
    "EXD": "Extrême droite",
    "DXD": "Extrême droite",
    "DIV": "Divers",
    "REG": "Régionalistes",
    "SE": "Sans étiquette"
}
