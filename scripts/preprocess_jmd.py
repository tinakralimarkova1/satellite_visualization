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

if __name__ == "__main__":
    main()