import pandas as pd
import plotly.express as px

df = pd.read_csv("JMD_satcat.csv")

# Convert to datetime
df["LDate"] = pd.to_datetime(df["LDate"], errors="coerce")

# Extract year
df["Year"] = df["LDate"].dt.year

launches_per_year = df.groupby("Year").size().reset_index(name="Count")

fig = px.bar(
    launches_per_year,
    x="Year",
    y="Count",
    title="Number of Satellite Launches per Year - JMD"
)

fig.update_layout(
    xaxis_title="Year",
    yaxis_title="Number of Launches"
)

fig.show()


