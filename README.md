# Cartes Électorales Paris (2020 - 2026)

Ce dépôt contient une suite d'outils Python et un tableau de bord web interactif permettant de visualiser et d'analyser les résultats des différentes élections à Paris (par bureau de vote) sur la période 2020-2026.

## 🌐 Aperçu du Projet
Le projet compile les résultats et propose des cartes interactives détaillées pour les scrutins suivants :
- **Élections Municipales** : 2020 (1er et 2e tour), 2026 (1er et 2e tour)
- **Élection Présidentielle** : 2022 (1er et 2e tour)
- **Élections Législatives** : 2022 (1er et 2e tour), 2024 (1er et 2e tour)
- **Élections Européennes** : 2024 (tour unique)

Toutes les cartes représentent les résultats par **parti/nuance politique** (et non pas par candidat individuel) avec trois couches interactives : la force politique en tête, le taux d'abstention, et le Top 3 des forces politiques par bureau.

---

## 📁 Structure du Projet

```
cartes-elections/
├── data/
│   ├── geojson/           # Tracés géométriques des bureaux de vote (2020 à 2026)
│   ├── raw/               # Téléchargements bruts (CSV, XLS, XLSX) [Exclu de Git]
│   └── processed/         # Données électorales nettoyées et harmonisées (JSON)
├── docs/
│   ├── index.html         # Tableau de bord principal (Interface Premium)
│   ├── style.css          # Design et chartes graphiques du dashboard
│   ├── app.js             # Logique d'affichage dynamique et graphiques Chart.js
│   └── outputs/           # Cartes Folium HTML générées par le script
└── scripts/
    ├── config.py          # Centralisation des couleurs des nuances et des répertoires
    ├── download_data.py   # Téléchargement automatique des sources (Paris Open Data / data.gouv.fr)
    ├── process_data.py    # Alignement géographique et d'appariement candidat-nuance
    └── build_maps.py      # Génération des cartes Folium interactives
```

---

## 🚀 Installation & Utilisation

### 1. Cloner le dépôt
```bash
git clone https://github.com/MarcOFlaherty/cartes-elections.git
cd cartes-elections
```

### 2. Configurer l'environnement virtuel et installer les dépendances
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```
*(Si le fichier `requirements.txt` n'est pas présent, installez les paquets suivants : `pandas`, `geopandas`, `openpyxl`, `xlrd`, `folium`, `branca`, `requests`, `beautifulsoup4`)*

### 3. Exécuter le pipeline de données
Le projet fonctionne en trois étapes simples :

1. **Téléchargement des données** :
   ```bash
   python scripts/download_data.py
   ```
   *Télécharge les géométries 2026, les exports CSV, les pièces jointes des arrondissements de Paris Open Data et les nuances officielles de data.gouv.fr.*

2. **Traitement et alignement** :
   ```bash
   python scripts/process_data.py
   ```
   *Nettoie les votes, résout les anomalies de saisie de noms (comme la correction spécifique de Sylvain Maillard) et exporte des fichiers JSON standardisés dans `data/processed/`.*

3. **Génération des cartes** :
   ```bash
   python scripts/build_maps.py
   ```
   *Fusionne les résultats géographiquement avec les GeoJSON et produit les fichiers cartographiques HTML autonomes dans `docs/outputs/`.*

---

## 🖥️ Visualiser le Tableau de Bord

Pour explorer les résultats et les cartes interactives :
1. Ouvrez simplement le fichier [docs/index.html](docs/index.html) dans n'importe quel navigateur internet moderne.
2. Le tableau de bord affiche un menu de sélection interactif (Année, Élection, Scrutin/Tour) et met à jour dynamiquement la carte ainsi que le panneau des statistiques consolidées à l'échelle de Paris (avec graphiques en anneau via Chart.js).

## 📄 Licence
Projet personnel d’analyse électorale. Tous droits réservés.
