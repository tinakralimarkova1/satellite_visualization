import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_CSV = BASE_DIR / "data" / "JMD_satcat.csv"
OUTPUT_JSON = BASE_DIR / "data" / "launches_by_year.json"

def main() -> None:
    df = pd.read_csv(INPUT_CSV)

    df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")
    df["Year"] = df["LDate"].dt.year

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

    OUTPUT_JSON_COUNTRY = BASE_DIR / "data" / "launches_by_year_country.json"

    # --- Launches per year per country ---

    # IMPORTANT: change this if your column name is different
    country_col = "State"

    df_filtered = df.dropna(subset=["Year", country_col])

    launches_by_country = (
        df_filtered
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




if __name__ == "__main__":
    main()