import { appState } from "./state.js?v=20260701";

let purposeYearData = [];

const purposeOrder = [
  "Observation",
  "Communication",
  "Geolocation",
  "Armamentation",
  "All Other Categories"
];

const purposeColors = {
  Observation: "#2563eb",
  Communication: "#f97316",
  Geolocation: "#16a34a",
  Armamentation: "#dc2626",
  "All Other Categories": "#64748b"
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

  // Plotly stacks the first trace at the bottom. Reverse the traces so the
  // stack reads top-to-bottom in the same order as the country-profile graph.
  const traces = [...purposes].reverse().map(purpose => {
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
        "<br>Satellites launched: %{y}<extra></extra>"
    };
  });

  Plotly.newPlot(
    chartEl,
    traces,
    {
      title: "Satellites Launched by Purpose Over Time",
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
        title: "Satellites Launched",
        gridcolor: "#e5e7eb"
      },
      legend: {
        orientation: "h",
        y: 1.12,
        traceorder: "reversed"
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "satellites_launched_by_purpose",
        scale: 2
      }
    }
  );
}
