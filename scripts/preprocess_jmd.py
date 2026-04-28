import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]

INPUT_CSV = BASE_DIR / "data" / "JMD_satcat.csv"
INPUT_PSATCAT_CSV = BASE_DIR / "data" / "JMD_psatcat.csv"
INPUT_ORGS_CSV = BASE_DIR / "data" / "JMD_orgs.csv"

OUTPUT_JSON = BASE_DIR / "data" / "launches_by_year.json"
OUTPUT_JSON_COUNTRY = BASE_DIR / "data" / "launches_by_year_country.json"
OUTPUT_JSON_PURPOSE = BASE_DIR / "data" / "launches_by_year_purpose.json"


def clean_main_satcat(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Remove metadata row like "# Updated 2026 ..."
    df = df[df["#JCAT"].astype(str).str.startswith("S", na=False)].copy()

    df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")
    df["Year"] = df["LDate"].dt.year

    return df


def clean_psatcat(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Remove metadata row like "# Updated 2026 ..."
    df = df[df["#JCAT"].astype(str).str.startswith("S", na=False)].copy()

    # Remove duplicates just in case
    df = df.drop_duplicates(subset=["#JCAT"])

    return df

def clean_orgs(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Keep only mapping columns needed for display labels
    df = df[["Code", "StateCode", "Type", "ShortEName", "EName"]].copy()

    # Clean strings
    df["Code"] = df["Code"].astype(str).str.strip()
    df["StateCode"] = df["StateCode"].astype(str).str.strip()
    df["Type"] = df["Type"].astype(str).str.strip()
    df["ShortEName"] = df["ShortEName"].astype(str).str.strip()
    df["EName"] = df["EName"].astype(str).str.strip()

    # Remove blank lookup keys
    df = df[(df["Code"] != "") & (df["Code"] != "nan")]
    df = df[(df["StateCode"] != "") & (df["StateCode"] != "nan")]

    return df


def build_code_to_state_code(orgs_df: pd.DataFrame) -> dict[str, str]:
    code_to_state_code: dict[str, str] = {}

    for _, row in orgs_df.iterrows():
        code_to_state_code.setdefault(row["Code"], row["StateCode"])

    return code_to_state_code


def build_state_code_to_english_name(orgs_df: pd.DataFrame) -> dict[str, str]:
    state_code_to_name: dict[str, str] = {}

    canonical_state_rows = orgs_df[orgs_df["Code"] == orgs_df["StateCode"]]

    english_name_overrides = {
        "US": "United States",
        "UK": "United Kingdom",
        "SU": "Russia",
        "RU": "Russia",
    }

    for _, row in canonical_state_rows.iterrows():
        short_english_name = row["ShortEName"]
        english_name = short_english_name if short_english_name and short_english_name != "-" else row["EName"]

        if english_name and english_name != "-":
            state_code = row["StateCode"]
            state_code_to_name.setdefault(
                state_code,
                english_name_overrides.get(state_code, english_name)
            )

    state_code_to_name["SU"] = "Russia"

    return state_code_to_name


def map_class_label(class_value: str) -> str:
    class_map = {
        "A": "Academic",
        "B": "Commercial",
        "C": "Civil",
        "D": "Military",
    }

    if pd.isna(class_value):
        return "Unknown"

    value = str(class_value).strip()

    # Exact single-letter match
    if value in class_map:
        return class_map[value]

    # Handle combined classes like CD, BD, CB, etc.
    labels = []
    for ch in value:
        if ch in class_map and class_map[ch] not in labels:
            labels.append(class_map[ch])

    return " + ".join(labels) if labels else "Unknown"


def main() -> None:
    df = pd.read_csv(INPUT_CSV, low_memory=False)
    psatcat_df = pd.read_csv(INPUT_PSATCAT_CSV, low_memory=False)

    df = clean_main_satcat(df)
    psatcat_df = clean_psatcat(psatcat_df)

    orgs_df = pd.read_csv(INPUT_ORGS_CSV, low_memory=False)
    orgs_df = clean_orgs(orgs_df)

    code_to_state_code = build_code_to_state_code(orgs_df)
    state_code_to_name = build_state_code_to_english_name(orgs_df)

    # Make sure keys match
    df["#JCAT"] = df["#JCAT"].astype(str).str.strip()
    psatcat_df["#JCAT"] = psatcat_df["#JCAT"].astype(str).str.strip()

    # GLOBAL FILTER: only keep items in both datasets
    df = df.merge(psatcat_df, how="inner", on="#JCAT")


    #Map country names to codes 
    df["State"] = df["State"].astype(str).str.strip()
    df["country_state_code"] = df["State"].map(code_to_state_code).fillna(df["State"])
    df["country_state_code"] = df["country_state_code"].replace({"SU": "RU"})
    df["country_name"] = df["country_state_code"].map(state_code_to_name).fillna(df["country_state_code"])

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
    country_col = "country_name"

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
            "count": int(row["count"]),
        }
        for _, row in launches_by_country.iterrows()
    ]

    with open(OUTPUT_JSON_COUNTRY, "w", encoding="utf-8") as f:
        json.dump(output_country, f, indent=2)

    print(f"Wrote {len(output_country)} rows to {OUTPUT_JSON_COUNTRY}")

    # ----------------------------
    # 3) Launches per year per purpose
    # Join JMD_satcat -> psatcat on #JCAT
    # Use psatcat.Class instead of orgs database
    # ----------------------------

    df["purpose"] = df["Class"].apply(map_class_label)

    df_purpose = df.dropna(subset=["Year"])

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
            "count": int(row["count"]),
        }
        for _, row in launches_by_purpose.iterrows()
    ]

    with open(OUTPUT_JSON_PURPOSE, "w", encoding="utf-8") as f:
        json.dump(output_purpose, f, indent=2)

    print(f"Wrote {len(output_purpose)} rows to {OUTPUT_JSON_PURPOSE}")


if __name__ == "__main__":
    main()
