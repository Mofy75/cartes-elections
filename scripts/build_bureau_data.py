"""Construit les résultats nationaux compacts par bureau et par département.

Sources attendues dans data/raw/ (ignoré par Git) :
- general_results.parquet et candidats_results.parquet (data.gouv.fr / MIOM)
- table-bv-reu.csv (Insee, correspondance MIOM ↔ REU)

Sortie : docs/bureaux_data/<departement>.json
"""

import json
import os
from collections import defaultdict

import duckdb

import config


RAW_DIR = config.RAW_DIR
OUTPUT_DIR = os.path.join(config.BASE_DIR, "docs", "bureaux_data")
GENERAL_PATH = os.path.join(RAW_DIR, "general_results.parquet")
CANDIDATES_PATH = os.path.join(RAW_DIR, "candidats_results.parquet")
MAPPING_PATH = os.path.join(RAW_DIR, "table-bv-reu.csv")

ELECTION_KEYS = {
    "2022_pres_t1": "p1",
    "2022_pres_t2": "p2",
    "2024_euro_t1": "eu",
}


def build_query():
    return f"""
        WITH mapping AS (
            SELECT DISTINCT id_brut_miom, id_brut_reu
            FROM read_csv_auto('{MAPPING_PATH}', all_varchar = true)
            WHERE id_brut_miom IS NOT NULL AND id_brut_reu IS NOT NULL
        ), candidate_votes AS (
            SELECT
                id_election,
                id_brut_miom,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 1 THEN voix ELSE 0 END) AS p1_1,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 2 THEN voix ELSE 0 END) AS p1_2,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 3 THEN voix ELSE 0 END) AS p1_3,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 4 THEN voix ELSE 0 END) AS p1_4,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 5 THEN voix ELSE 0 END) AS p1_5,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 6 THEN voix ELSE 0 END) AS p1_6,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 7 THEN voix ELSE 0 END) AS p1_7,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 8 THEN voix ELSE 0 END) AS p1_8,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 9 THEN voix ELSE 0 END) AS p1_9,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 10 THEN voix ELSE 0 END) AS p1_10,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 11 THEN voix ELSE 0 END) AS p1_11,
                SUM(CASE WHEN id_election = '2022_pres_t1' AND no_panneau = 12 THEN voix ELSE 0 END) AS p1_12,
                SUM(CASE WHEN id_election = '2022_pres_t2' AND no_panneau = 1 THEN voix ELSE 0 END) AS p2_1,
                SUM(CASE WHEN id_election = '2022_pres_t2' AND no_panneau = 2 THEN voix ELSE 0 END) AS p2_2,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LRN' THEN voix ELSE 0 END) AS eu_1,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LENS' THEN voix ELSE 0 END) AS eu_2,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LUG' THEN voix ELSE 0 END) AS eu_3,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LFI' THEN voix ELSE 0 END) AS eu_4,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LLR' THEN voix ELSE 0 END) AS eu_5,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LVEC' THEN voix ELSE 0 END) AS eu_6,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LREC' THEN voix ELSE 0 END) AS eu_7,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance = 'LCOM' THEN voix ELSE 0 END) AS eu_8,
                SUM(CASE WHEN id_election = '2024_euro_t1' AND nuance NOT IN ('LRN','LENS','LUG','LFI','LLR','LVEC','LREC','LCOM') THEN voix ELSE 0 END) AS eu_9
            FROM read_parquet('{CANDIDATES_PATH}')
            WHERE id_election IN ('2022_pres_t1', '2022_pres_t2', '2024_euro_t1')
            GROUP BY id_election, id_brut_miom
        )
        SELECT
            g.id_election,
            m.id_brut_reu,
            g.code_departement,
            g.code_commune,
            g.libelle_commune,
            g.code_bv,
            g.inscrits,
            g.votants,
            g.exprimes,
            cv.p1_1, cv.p1_2, cv.p1_3, cv.p1_4, cv.p1_5, cv.p1_6,
            cv.p1_7, cv.p1_8, cv.p1_9, cv.p1_10, cv.p1_11, cv.p1_12,
            cv.p2_1, cv.p2_2,
            cv.eu_1, cv.eu_2, cv.eu_3, cv.eu_4, cv.eu_5,
            cv.eu_6, cv.eu_7, cv.eu_8, cv.eu_9
        FROM read_parquet('{GENERAL_PATH}') g
        JOIN mapping m USING (id_brut_miom)
        JOIN candidate_votes cv USING (id_election, id_brut_miom)
        WHERE g.id_election IN ('2022_pres_t1', '2022_pres_t2', '2024_euro_t1')
        ORDER BY g.code_departement, m.id_brut_reu, g.id_election
    """


def compact_election(row):
    election_id = row[0]
    if election_id == "2022_pres_t1":
        votes = list(row[9:21])
    elif election_id == "2022_pres_t2":
        votes = list(row[21:23])
    else:
        votes = list(row[23:32])
    return [row[6] or 0, row[7] or 0, row[8] or 0, [value or 0 for value in votes]]


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    connection = duckdb.connect()
    cursor = connection.execute(build_query())
    departments = defaultdict(dict)

    while rows := cursor.fetchmany(10_000):
        for row in rows:
            election_id, reu_id, dep, insee, commune, bureau = row[:6]
            office = departments[str(dep)].setdefault(
                reu_id,
                {"c": str(insee), "n": commune, "b": str(bureau)},
            )
            office[ELECTION_KEYS[election_id]] = compact_election(row)

    total = 0
    for dep, offices in departments.items():
        output_path = os.path.join(OUTPUT_DIR, f"{dep}.json")
        with open(output_path, "w", encoding="utf-8") as stream:
            json.dump(offices, stream, ensure_ascii=False, separators=(",", ":"))
        total += len(offices)
        print(f"{dep}: {len(offices):,} bureaux")

    print(f"Terminé : {total:,} bureaux dans {len(departments)} départements.")


if __name__ == "__main__":
    main()
