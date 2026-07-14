import os
import glob
import json
import re
import pandas as pd
import geopandas as gpd
import folium
import config

def get_couleur_abstention(taux):
    """Retourne une couleur du beige clair au rouge foncé en fonction du taux d'abstention."""
    if pd.isna(taux): 
        return "#e0e0e0"
    if taux < 20: 
        return "#fef0d9"
    if taux < 30: 
        return "#fdcc8a"
    if taux < 40: 
        return "#fc8d59"
    if taux < 50: 
        return "#e34a33"
    return "#b30000"

def build_map(election_id, json_path, geojson_path):
    print(f"🗺️  Génération de la carte pour {election_id}...")
    
    # 1. Charger les données géographiques
    if not os.path.exists(geojson_path):
        print(f"❌ GeoJSON manquant : {geojson_path}")
        return False
        
    gdf = gpd.read_file(geojson_path)
    
    # Normaliser id_bv dans le GeoDataFrame
    if 'id_bv' not in gdf.columns:
        # Essayer de trouver une colonne similaire
        for col in gdf.columns:
            if col.lower() in ['id_bv', 'id_bvote', 'id_bv_vote']:
                gdf = gdf.rename(columns={col: 'id_bv'})
                break
                
    if 'id_bv' not in gdf.columns:
        print(f"❌ Impossible de trouver la colonne id_bv dans {geojson_path}")
        return False
        
    gdf['id_bv'] = gdf['id_bv'].astype(str).str.strip()
    
    # 2. Charger les données électorales
    if not os.path.exists(json_path):
        print(f"❌ JSON traité manquant : {json_path}")
        return False
        
    df = pd.read_json(json_path)
    df['id_bv'] = df['id_bv'].astype(str).str.strip()
    
    # 3. Fusionner les données
    gdf_merge = gdf.merge(df, on='id_bv', how='left')
    gdf_merge = gdf_merge.set_geometry('geometry')
    
    # Filtrer les géométries vides ou invalides
    gdf_merge = gdf_merge[gdf_merge.geometry.notna()]
    gdf_merge = gdf_merge[gdf_merge.geometry.is_valid & ~gdf_merge.geometry.is_empty]
    
    # 4. Formater les champs pour les tooltips Folium
    gdf_merge['participation_str'] = gdf_merge['participation'].apply(lambda x: f"{x:.1f} %" if pd.notna(x) else "N/A")
    gdf_merge['abstention_str'] = gdf_merge['abstention'].apply(lambda x: f"{x:.1f} %" if pd.notna(x) else "N/A")
    gdf_merge['winner_score_str'] = gdf_merge['winner_score'].apply(lambda x: f"{x:.1f} %" if pd.notna(x) else "N/A")
    gdf_merge['winner_name_readable'] = gdf_merge['winner_party'].apply(lambda x: config.NOMS_NUANCES.get(x, x) if pd.notna(x) else "Tranché au 1er tour")
    
    # Remplacer les valeurs nulles pour éviter les plantages Folium/Leaflet
    gdf_merge['winner_color'] = gdf_merge['winner_color'].fillna("#e0e0e0")
    gdf_merge['top3_html'] = gdf_merge['top3_html'].fillna("Scrutin tranché au 1er tour")
    
    # Créer la carte centrée sur Paris
    m = folium.Map(location=[48.8566, 2.3522], zoom_start=12, tiles="cartodb positron")
    
    # --- Couche 1 : Parti arrivé en tête ---
    fg_winner = folium.FeatureGroup(name="Parti arrivé en tête", show=True)
    tooltip_winner = folium.features.GeoJsonTooltip(
        fields=["id_bv", "winner_name_readable", "winner_score_str"],
        aliases=["Bureau :", "Gagnant :", "Score :"],
        sticky=True
    )
    fg_winner.add_child(folium.GeoJson(
        gdf_merge,
        style_function=lambda f: {
            "fillColor": f["properties"].get("winner_color", "#e0e0e0"),
            "color": "black", "weight": 0.3, "fillOpacity": 0.8,
        },
        tooltip=tooltip_winner
    ))
    fg_winner.add_to(m)
    
    # --- Couche 2 : Taux d'abstention ---
    fg_abstention = folium.FeatureGroup(name="Taux d’abstention", show=False)
    tooltip_abstention = folium.features.GeoJsonTooltip(
        fields=["id_bv", "abstention_str"],
        aliases=["Bureau :", "Abstention :"],
        sticky=True
    )
    fg_abstention.add_child(folium.GeoJson(
        gdf_merge,
        style_function=lambda f: {
            "fillColor": get_couleur_abstention(f["properties"].get("abstention")),
            "color": "black", "weight": 0.3, "fillOpacity": 0.7,
        },
        tooltip=tooltip_abstention
    ))
    fg_abstention.add_to(m)
    
    # --- Couche 3 : Top 3 partis (détails au survol) ---
    fg_top3 = folium.FeatureGroup(name="Top 3 partis (détails au survol)", show=False)
    tooltip_top3 = folium.features.GeoJsonTooltip(
        fields=["top3_html"],
        aliases=[""],
        sticky=True
    )
    fg_top3.add_child(folium.GeoJson(
        gdf_merge,
        style_function=lambda f: {
            "fillColor": f["properties"].get("winner_color", "#e0e0e0"),
            "color": "black", "weight": 0.2, "fillOpacity": 0.65,
        },
        tooltip=tooltip_top3
    ))
    fg_top3.add_to(m)
    
    # Contrôle des couches
    folium.LayerControl(collapsed=False).add_to(m)
    
    # Custom CSS pour styliser le contrôle des couches en thème sombre premium
    from branca.element import Element
    custom_css = """
    <style>
    .leaflet-control-layers {
        background: #151C2C !important;
        color: #F8FAFC !important;
        border: 1px solid rgba(255, 255, 255, 0.08) !important;
        border-radius: 10px !important;
        font-family: 'Outfit', sans-serif !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4) !important;
        padding: 10px 14px !important;
        font-size: 0.85rem !important;
    }
    .leaflet-control-layers-list label {
        margin-bottom: 6px !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
    }
    .leaflet-control-layers-separator {
        border-top: 1px solid rgba(255, 255, 255, 0.08) !important;
        margin: 8px 0 !important;
    }
    .leaflet-control-layers input[type="checkbox"],
    .leaflet-control-layers input[type="radio"] {
        cursor: pointer !important;
        accent-color: #8B5CF6 !important;
    }
    </style>
    """
    m.get_root().header.add_child(Element(custom_css))
    
    # Sauvegarde
    output_path = os.path.join(config.OUTPUT_DIR, f"{election_id}.html")
    m.save(output_path)
    print(f"✅ Carte sauvegardée : {output_path}")
    return True

def main():
    print("🚀 Début de la génération des cartes...")
    
    processed_files = glob.glob(os.path.join(config.PROCESSED_DIR, "*.json"))
    
    for json_path in sorted(processed_files):
        filename = os.path.basename(json_path)
        election_id = filename.replace(".json", "")
        
        # Déterminer l'année à partir de l'election_id (ex: municipales_2020_t1 -> 2020)
        year_match = re.search(r"202\d", election_id)
        if year_match:
            year = year_match.group(0)
        else:
            print(f"⚠️ Impossible de déterminer l'année pour {filename}, ignoré.")
            continue
            
        geojson_path = config.GEOJSON_FILES.get(year)
        if not geojson_path:
            print(f"⚠️ Aucun GeoJSON configuré pour l'année {year}, ignoré.")
            continue
            
        build_map(election_id, json_path, geojson_path)
        
    print("🎉 Toutes les cartes ont été générées.")

if __name__ == "__main__":
    main()
