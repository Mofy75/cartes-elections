import geopandas as gpd
import folium


# Charger le fond de carte complet
gdf = gpd.read_file("data/secteurs_bv_2024.geojson")

print("\n--- Colonnes disponibles ---")
print(gdf.columns)


# Filtrer les bureaux du 12e arrondissement (test avec "12" entre guillemets au cas où)
gdf_12 = gdf[gdf["arrondissement_bv"] == 12]

# Vérifier le nombre de bureaux retenus
print(f"\nNombre de bureaux dans le 12e arrondissement : {gdf_12.shape[0]}")

# Créer une carte centrée sur le 12e
m = folium.Map(tiles='CartoDB positron', zoom_start=13)

# Ajouter les secteurs géographiques
geojson_layer = folium.GeoJson(
    gdf_12,
    name="Bureaux du 12e",
    tooltip=folium.GeoJsonTooltip(fields=["id_bv", "numero_bv"], aliases=["ID Bureau :", "Numéro Bureau :"])
).add_to(m)

# Centrer la carte automatiquement sur le contenu
m.fit_bounds(geojson_layer.get_bounds())

# Ajouter un contrôle de couches
folium.LayerControl().add_to(m)

# Enregistrer la carte
m.save("outputs/carte_abstention.html")
print("\n✅ Carte générée : outputs/carte_abstention.html")
