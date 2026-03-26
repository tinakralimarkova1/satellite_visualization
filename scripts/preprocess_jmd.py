import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT_CSV = BASE_DIR / "data" / "JMD_satcat.csv"
INPUT_ORGS_CSV = BASE_DIR / "data" / "JMD_orgs.csv"

OUTPUT_JSON = BASE_DIR / "data" / "launches_by_year.json"
OUTPUT_JSON_COUNTRY = BASE_DIR / "data" / "launches_by_year_country.json"
OUTPUT_JSON_PURPOSE = BASE_DIR / "data" / "launches_by_year_purpose.json"


def main() -> None:
    df = pd.read_csv(INPUT_CSV)
    orgs_df = pd.read_csv(INPUT_ORGS_CSV)

    # ----------------------------
    # Common date cleaning
    # ----------------------------
    df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")
    df["Year"] = df["LDate"].dt.year

    # ----------------------------
    # 1) Launches per year
    # ----------------------------
    launches_per_year = (
        df.dropna(subset=["Year"])
          .groupby("Year")
          .size()
          .reset_index(name="count")
    )

    launches_per_year["Year"] = launches_per_year["Year"].astype(int)

    output = [
        {"year": int(row["Year"]), "count": int(row["count"])}
        for _, row in launches_per_year.iterrows()
    ]

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(output)} rows to {OUTPUT_JSON}")

    # ----------------------------
    # 2) Launches per year per country
    # ----------------------------
    country_col = "State"

    df_country = df.dropna(subset=["Year", country_col])

    launches_by_country = (
        df_country
        .groupby(["Year", country_col])
        .size()
        .reset_index(name="count")
    )

    launches_by_country["Year"] = launches_by_country["Year"].astype(int)

    output_country = [
        {
            "year": int(row["Year"]),
            "country": str(row[country_col]),
            "count": int(row["count"])
        }
        for _, row in launches_by_country.iterrows()
    ]

    with open(OUTPUT_JSON_COUNTRY, "w", encoding="utf-8") as f:
        json.dump(output_country, f, indent=2)

    print(f"Wrote {len(output_country)} rows to {OUTPUT_JSON_COUNTRY}")

    # ----------------------------
    # 3) Launches per year per purpose
    # Join satcat.Owner -> orgs.Code
    # Class letters:
    # A = Academic
    # B = Commercial
    # C = Civil
    # D = Military
    # ----------------------------

    class_map = {
        "A": "Academic",
        "B": "Commercial",
        "C": "Civil",
        "D": "Military"
    }

    # Keep only needed org columns
    orgs_lookup = orgs_df[["Code", "Class"]].copy()

    # Merge satcat with orgs
    df_merged = df.merge(
        orgs_lookup,
        how="left",
        left_on="Owner",
        right_on="Code"
    )

    # Map class letters to readable names
    df_merged["purpose"] = df_merged["Class"].map(class_map)

    # Optional: keep unknowns instead of dropping them
    df_merged["purpose"] = df_merged["purpose"].fillna("Unknown")

    df_purpose = df_merged.dropna(subset=["Year"])

    launches_by_purpose = (
        df_purpose
        .groupby(["Year", "purpose"])
        .size()
        .reset_index(name="count")
    )

    launches_by_purpose["Year"] = launches_by_purpose["Year"].astype(int)

    output_purpose = [
        {
            "year": int(row["Year"]),
            "purpose": str(row["purpose"]),
            "count": int(row["count"])
        }
        for _, row in launches_by_purpose.iterrows()
    ]

    with open(OUTPUT_JSON_PURPOSE, "w", encoding="utf-8") as f:
        json.dump(output_purpose, f, indent=2)

    print(f"Wrote {len(output_purpose)} rows to {OUTPUT_JSON_PURPOSE}")


if __name__ == "__main__":
    main()