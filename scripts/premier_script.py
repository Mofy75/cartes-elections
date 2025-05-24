print("👋 Hello Python project! Bienvenue dans ton environnement.")

import pandas as pd

# Charger la base de données
df = pd.read_csv("data/municipales_2020.csv", sep=";", encoding="latin1")

# Afficher les 5 premières lignes
print(df.head())

# Dimensions de la base (lignes, colonnes)
print("\n--- Dimensions du tableau ---")
print(df.shape)

# Liste des colonnes
print("\n--- Colonnes disponibles ---")
print(df.columns)

# Types de données par colonne
print("\n--- Types de données ---")
print(df.dtypes)

# Infos globales sur la base
print("\n--- Aperçu global de la base ---")
print(df.info())

# Nettoyage des données

# Remplacer la virgule par un point et convertir les colonnes de géométrie en float
df["st_area(shape)"] = df["st_area(shape)"].str.replace(",", ".").astype(float)
df["st_perimeter(shape)"] = df["st_perimeter(shape)"].str.replace(",", ".").astype(float)

# Nettoyer la colonne du taux d'abstention en %
df["Taux d'abstention en %"] = df["Taux d'abstention en %"].str.replace(" %", "").astype(int)

# Renommer les colonnes pour enlever les espaces bizarres
df = df.rename(columns={
    "Taux d'abstention en %": "Taux_abstention_pourcent",
    "Taux abstention": "Taux_abstention",
    "st_area(shape)": "Surface_shape",
    "st_perimeter(shape)": "Perimetre_shape"
})

# Vérifier après nettoyage
print("\n--- Colonnes après nettoyage ---")
print(df.columns)
print("\n--- Types de données après nettoyage ---")
print(df.dtypes)

import geopandas as gpd

# Charger le shapefile complet de Paris
gdf = gpd.read_file("data/bureaux-de-vote-2024/bureaux-de-vote-2024.shp")

# Afficher les premières lignes pour comprendre la structure
print("\n--- Aperçu du fond de carte ---")
print(gdf.head())

# Filtrer uniquement les bureaux du 12e arrondissement
gdf_12 = gdf[gdf["arrrondisse"] == 12]

# Vérification rapide
print(f"\nNombre de bureaux dans le 12e arrondissement : {gdf_12.shape[0]}")

# Sauvegarder le fond de carte du 12e pour plus tard
gdf_12.to_file("data/bureaux_12e.geojson", driver="GeoJSON")
print("\n✅ Fond de carte du 12e enregistré dans data/bureaux_12e.geojson")

import geopandas as gpd

# Charger ton fond de carte du 12e arrondissement
gdf_12 = gpd.read_file("data/bureaux_12e.geojson")

# Afficher les 5 premières lignes pour vérifier
print("\n--- Fond de carte du 12e arrondissement ---")
print(gdf_12.head())
