import json
from pathlib import Path
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_CSV = BASE_DIR / "data" / "JMD_satcat.csv"
OUTPUT_JSON = BASE_DIR / "data" / "launches_geo.json"

STATE_TO_COUNTRY = {
    "US": "United States",
    "SU": "Russia",
    "RU": "Russia",
    "CN": "China",
    "F": "France",
    "J": "Japan",
    "UK": "United Kingdom",
    "IN": "India",
    "NZ": "New Zealand",
    "D": "Germany",
    "CA": "Canada",
    "I": "Italy",
    "L": "Luxembourg",
    "KR": "South Korea",
    "E": "Spain",
    "AU": "Australia",
    "IL": "Israel",
    "TR": "Turkey",
    "UY": "Uruguay",
    "FI": "Finland",
    "BR": "Brazil",
    "TW": "Taiwan",
    "IR": "Iran",
    "UAE": "United Arab Emirates",
    "ID": "Indonesia",
    "SG": "Singapore",
    "MY": "Malaysia",
    "PK": "Pakistan",
    "SA": "Saudi Arabia",
    "AR": "Argentina",
    "MX": "Mexico",
    "BE": "Belgium",
    "NL": "Netherlands",
    "SE": "Sweden",
    "CH": "Switzerland",
    "NO": "Norway",
    "DK": "Denmark",
    "AT": "Austria",
    "TH": "Thailand",
    "PH": "Philippines",
    "VN": "Vietnam",
    "EG": "Egypt",
    "ZA": "South Africa",
    "PL": "Poland",
    "CZ": "Czech Republic",
    "HU": "Hungary",
    "RO": "Romania",
    "PT": "Portugal",
    "GR": "Greece",
    "UA": "Ukraine",
    "BY": "Belarus",
    "KZ": "Kazakhstan",
}

EXCLUDE_CODES = {
    "-", "I-ESA", "I-EU", "I-INT", "EARTH", "LUNA", "SSYS"
}

def main():
    df = pd.read_csv(INPUT_CSV, low_memory=False)

    df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")
    df["year"] = df["LDate"].dt.year
    df["State"] = df["State"].astype(str).str.strip()

    df = df.dropna(subset=["year"])
    df = df[~df["State"].isin(EXCLUDE_CODES)]

    df["country"] = df["State"].map(STATE_TO_COUNTRY)
    df = df.dropna(subset=["country"])

    grouped = (
        df.groupby(["year", "country"])
          .size()
          .reset_index(name="count")
          .sort_values(["year", "country"])
    )

    grouped["year"] = grouped["year"].astype(int)
    grouped["count"] = grouped["count"].astype(int)

    output = grouped.to_dict(orient="records")

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)

    print(f"Wrote {len(output)} rows to {OUTPUT_JSON}")

if __name__ == "__main__":
    main()