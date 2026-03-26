import { appState } from "./state.js";

let geoData = [];

async function loadGeoData() {
  if (geoData.length > 0) return;

  const response = await fetch("./data/launches_geo.json");
  if (!response.ok) {
    throw new Error(`Failed to load geo data: ${response.status}`);
  }

  geoData = await response.json();
}

export async function renderGeoLaunchMap() {
  await loadGeoData();

  const chartEl = document.getElementById("chart-launches-geo");
  if (!chartEl) {
    throw new Error("Could not find #chart-launches-geo");
  }

  const [minYear, maxYear] = appState.yearRange;

  const filtered = geoData.filter(
    row => row.year >= minYear && row.year <= maxYear
  );

  const countryTotals = new Map();

  filtered.forEach(row => {
    countryTotals.set(
      row.country,
      (countryTotals.get(row.country) || 0) + row.count
    );
  });

  const countries = Array.from(countryTotals.keys());
  const counts = Array.from(countryTotals.values());

  Plotly.newPlot(
    chartEl,
    [
      {
        type: "choropleth",
        locationmode: "country names",
        locations: countries,
        z: counts,
        text: countries,
        colorscale: "Blues",
        reversescale: true,
        marker: {
          line: {
            color: "white",
            width: 0.5
          }
        },
        colorbar: {
          title: "Launches"
        },
        hovertemplate:
          "Country: %{text}<br>Launches: %{z}<extra></extra>"
      }
    ],
    {
      title: `Satellite Launches by Country (${minYear}–${maxYear})`,
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { t: 50, r: 20, b: 20, l: 20 },
      font: {
        family: "Inter, Arial, sans-serif",
        color: "#1f2937"
      },
      geo: {
        projection: {
          type: "natural earth"
        },
        showframe: false,
        showcoastlines: true,
        coastlinecolor: "#d1d5db",
        bgcolor: "white"
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "launches_by_country_map",
        scale: 2
      }
    }
  );
}