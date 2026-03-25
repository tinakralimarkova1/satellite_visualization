import pandas as pd
import plotly.express as px

# Read file
df = pd.read_csv("JMD_satcat.csv", low_memory=False)

# Convert launch date to datetime
df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")

# Keep only launched objects with a real date and country code
df = df.dropna(subset=["LDate", "State"])

# Count launches by state/country code
country_counts = (
    df.groupby("State")
      .size()
      .reset_index(name="LaunchCount")
)

# Map JMD state codes to ISO-3 country codes and readable names
state_to_iso3 = {
    "US": "USA",
    "SU": "RUS",   # Soviet Union -> map to Russia for modern world maps
    "RU": "RUS",
    "CN": "CHN",
    "FR": "FRA",
    "IN": "IND",
    "JP": "JPN",
    "GB": "GBR",
    "UK": "GBR",
    "IT": "ITA",
    "CA": "CAN",
    "DE": "DEU",
    "AU": "AUS",
    "IL": "ISR",
    "IR": "IRN",
    "KR": "KOR",
    "KP": "PRK",
    "BR": "BRA",
    "ES": "ESP",
    "AR": "ARG",
    "UA": "UKR",
    "KZ": "KAZ",
    "NZ": "NZL",
    "PK": "PAK",
    "TR": "TUR",
    "ID": "IDN",
    "MX": "MEX",
    "SE": "SWE",
    "NO": "NOR",
    "ZA": "ZAF",
    "AE": "ARE",
    "SA": "SAU"
}

state_to_name = {
    "US": "United States",
    "SU": "Soviet Union",
    "RU": "Russia",
    "CN": "China",
    "FR": "France",
    "IN": "India",
    "JP": "Japan",
    "GB": "United Kingdom",
    "UK": "United Kingdom",
    "IT": "Italy",
    "CA": "Canada",
    "DE": "Germany",
    "AU": "Australia",
    "IL": "Israel",
    "IR": "Iran",
    "KR": "South Korea",
    "KP": "North Korea",
    "BR": "Brazil",
    "ES": "Spain",
    "AR": "Argentina",
    "UA": "Ukraine",
    "KZ": "Kazakhstan",
    "NZ": "New Zealand",
    "PK": "Pakistan",
    "TR": "Turkey",
    "ID": "Indonesia",
    "MX": "Mexico",
    "SE": "Sweden",
    "NO": "Norway",
    "ZA": "South Africa",
    "AE": "United Arab Emirates",
    "SA": "Saudi Arabia"
}

country_counts["iso3"] = country_counts["State"].map(state_to_iso3)
country_counts["Country"] = country_counts["State"].map(state_to_name)

# Drop codes that were not mapped yet
country_counts = country_counts.dropna(subset=["iso3"])

# Optional: log scale color, useful if US/Russia dominate too much
country_counts["LaunchCountLog"] = country_counts["LaunchCount"].apply(lambda x: x if x <= 0 else x)

fig = px.choropleth(
    country_counts,
    locations="iso3",
    color="LaunchCount",
    hover_name="Country",
    hover_data={"State": True, "LaunchCount": True, "iso3": False},
    color_continuous_scale="Viridis",
    projection="natural earth",
    title="Geographic Distribution of Satellite Launches in JMD Dataset"
)

fig.update_layout(
    geo=dict(showframe=False, showcoastlines=True),
    margin=dict(l=20, r=20, t=60, b=20)
)

fig.show()