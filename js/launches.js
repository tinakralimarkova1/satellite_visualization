import { appState } from "./state.js";

export async function renderLaunchesChart() {
  const chartEl = document.getElementById("chart-launches");
  if (!chartEl) {
    throw new Error("Could not find #chart-launches");
  }

  const response = await fetch("./data/launches_by_year.json");
  if (!response.ok) {
    throw new Error(`Failed to load launches data: ${response.status}`);
  }

  const data = await response.json();

  const [minYear, maxYear] = appState.yearRange;

  const filteredData = data.filter(d => d.year >= minYear && d.year <= maxYear);

  const years = filteredData.map(d => d.year);
  const counts = filteredData.map(d => d.count);

  Plotly.newPlot(
    chartEl,
    [
      {
        x: years,
        y: counts,
        type: "bar",
        hovertemplate: "Year: %{x}<br>Launches: %{y}<extra></extra>"
      }
    ],
    {
      title: "Number of Satellite Launches per Year - JMD",
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { t: 50, r: 20, b: 60, l: 60 },
      font: {
        family: "Inter, Arial, sans-serif",
        color: "#1f2937"
      },
      xaxis: {
        title: "Year",
        type: "category",
        gridcolor: "#e5e7eb"
      },
      yaxis: {
        title: "Number of Launches",
        gridcolor: "#e5e7eb"
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "launches_by_year_jmd",
        scale: 2
      }
    }
  );
}