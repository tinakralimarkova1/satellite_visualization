import { appState } from "./state.js";

let purposeYearData = [];

const purposeOrder = ["Academic", "Commercial", "Civil", "Military", "Unknown"];

const purposeColors = {
  Academic: "#1f77b4",
  Commercial: "#ff7f0e",
  Civil: "#2ca02c",
  Military: "#d62728",
  Unknown: "#7f7f7f"
};

export async function renderPurposeStackedChart() {
  if (purposeYearData.length === 0) {
    const response = await fetch("./data/launches_by_year_purpose.json");
    if (!response.ok) {
      throw new Error(`Failed to load purpose-year data: ${response.status}`);
    }
    purposeYearData = await response.json();
  }

  const chartEl = document.getElementById("chart-purpose");
  if (!chartEl) {
    throw new Error("Could not find #chart-purpose");
  }

  const [minYear, maxYear] = appState.yearRange;

  const filtered = purposeYearData.filter(
    row => row.year >= minYear && row.year <= maxYear
  );

  const years = Array.from(new Set(filtered.map(row => row.year))).sort((a, b) => a - b);

  const purposesInData = Array.from(new Set(filtered.map(row => row.purpose)));

  const purposes = purposeOrder.filter(purpose => purposesInData.includes(purpose));

  const traces = purposes.map(purpose => {
    const purposeRows = filtered.filter(row => row.purpose === purpose);
    const countMap = new Map(purposeRows.map(row => [row.year, row.count]));

    return {
      x: years,
      y: years.map(year => countMap.get(year) || 0),
      type: "bar",
      name: purpose,
      marker: {
        color: purposeColors[purpose] || "#9ca3af"
      },
      hovertemplate:
        "Year: %{x}<br>Purpose: " +
        purpose +
        "<br>Launches: %{y}<extra></extra>"
    };
  });

  Plotly.newPlot(
    chartEl,
    traces,
    {
      title: "Satellite Launches by Purpose Over Time",
      barmode: "stack",
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { t: 150, r: 20, b: 60, l: 60 },
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
      },
      legend: {
        orientation: "h",
        y: 1.12
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "launches_by_purpose_stacked",
        scale: 2
      }
    }
  );
}