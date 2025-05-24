import pandas as pd
import geopandas as gpd
import folium
from branca.colormap import linear

# 1. Charger les résultats électoraux du 12e arrondissement
df_votes = pd.read_csv("data/municipales_2020.csv", sep=";", encoding="latin1")

# 2. Charger le fond de carte complet de Paris
gdf = gpd.read_file("data/secteurs_bv_2024.geojson")

# 3. Filtrer uniquement Paris 12
gdf_12 = gdf[gdf["arrondissement_bv"] == 12]

# 4. Nettoyer id_bv pour enlever "12-" et matcher avec ID_BVOTE
gdf_12["id_bv_clean"] = gdf_12["id_bv"].str.replace("12-", "").astype(int)

# 5. Harmoniser ID_BVOTE
df_votes["ID_BVOTE"] = df_votes["ID_BVOTE"].astype(int)

# 6. Fusionner votes et polygones
gdf_12 = gdf_12.merge(df_votes, left_on="id_bv_clean", right_on="ID_BVOTE", how="left")

# 7. Nettoyer les noms de colonnes après fusion
gdf_12 = gdf_12.rename(columns={
    "Taux d'abstention en %": "Taux_abstention_pourcent",
    "Taux abstention": "Taux_abstention"
})

# 8. Nettoyer les types pour Taux_abstention_pourcent
gdf_12["Taux_abstention_pourcent"] = gdf_12["Taux_abstention_pourcent"].str.replace('%', '').str.replace(',', '.').astype(float)

# 9. Créer une nouvelle colonne pour le pourcentage PS parmi exprimés
gdf_12["Pourcentage_PS"] = (gdf_12["M. GRÉGOIRE Emmanuel   (PS)"] / gdf_12["NB_EXPRIM"]) * 100

# 10. Créer une carte Folium de base
m = folium.Map(tiles="CartoDB positron", zoom_start=13)

# 11. Couche 1 : Taux d'abstention (dégradé rouge)
abstention_colormap = linear.Reds_09.scale(
    gdf_12["Taux_abstention_pourcent"].min(),
    gdf_12["Taux_abstention_pourcent"].max()
)

folium.GeoJson(
    gdf_12,
    name="Taux d'abstention",
    style_function=lambda feature: {
        "fillColor": abstention_colormap(feature["properties"]["Taux_abstention_pourcent"]) if feature["properties"]["Taux_abstention_pourcent"] is not None else "transparent",
        "color": "black",
        "weight": 1,
        "fillOpacity": 0.7,
    },
    tooltip=folium.GeoJsonTooltip(
        fields=["id_bv", "Taux_abstention_pourcent"],
        aliases=["Bureau :", "Taux d'abstention (%) :"],
        localize=True
    )
).add_to(m)

abstention_colormap.caption = "Taux d'abstention (%)"
abstention_colormap.add_to(m)

# 12. Couche 2 : Pourcentage votes PS (dégradé rose)
ps_colormap = linear.RdPu_09.scale(
    gdf_12["Pourcentage_PS"].min(),
    gdf_12["Pourcentage_PS"].max()
)

folium.GeoJson(
    gdf_12,
    name="Votes PS",
    style_function=lambda feature: {
        "fillColor": ps_colormap(feature["properties"]["Pourcentage_PS"]) if feature["properties"]["Pourcentage_PS"] is not None else "transparent",
        "color": "black",
        "weight": 1,
        "fillOpacity": 0.7,
    },
    tooltip=folium.GeoJsonTooltip(
        fields=["id_bv", "Pourcentage_PS"],
        aliases=["Bureau :", "Score PS (%) :"],
        localize=True
    )
).add_to(m)

ps_colormap.caption = "Score PS (%)"
ps_colormap.add_to(m)

# 13. Ajouter un LayerControl pour choisir les couches
folium.LayerControl(collapsed=False).add_to(m)

# 14. Sauvegarder la carte
m.save("outputs/carte_municipales_2020.html")

print("\n✅ Carte Municipales 2020 Paris 12 générée : outputs/carte_municipales_2020.html")
