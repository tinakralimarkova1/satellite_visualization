import { appState } from "./state.js";

let countryYearData = [];
let countryColorMap = {};

function generateColorMap(countries) {
  const palette = [
    "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728",
    "#9467bd", "#8c564b", "#e377c2", "#7f7f7f",
    "#bcbd22", "#17becf", "#393b79", "#637939"
  ];

  countries.forEach((country, index) => {
    if (!countryColorMap[country]) {
      countryColorMap[country] = palette[index % palette.length];
    }
  });
}

export async function initializeCountryFilter() {
  const response = await fetch("./data/launches_by_year_country.json");
  if (!response.ok) {
    throw new Error(`Failed to load country-year data: ${response.status}`);
  }

  countryYearData = await response.json();

  const checkboxContainer = document.getElementById("country-checkboxes");
  if (!checkboxContainer) {
    throw new Error("Could not find #country-checkboxes");
  }

  const countryTotals = new Map();

  countryYearData.forEach(row => {
    const country = row.country;
    const count = row.count;
    countryTotals.set(country, (countryTotals.get(country) || 0) + count);
  });

  const sortedCountries = Array.from(countryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);

  generateColorMap(sortedCountries);

  const defaultCountries = sortedCountries.slice(0, 8);
  appState.selectedCountries = [...defaultCountries];

  checkboxContainer.innerHTML = "";

  sortedCountries.forEach(country => {
    const label = document.createElement("label");
    label.innerHTML = `
      <input type="checkbox" value="${country}" ${defaultCountries.includes(country) ? "checked" : ""} />
      ${country}
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", async () => {
      const checkedCountries = Array.from(
        checkboxContainer.querySelectorAll("input:checked")
      ).map(input => input.value);

      appState.selectedCountries = checkedCountries;
      await renderCountryStackedChart();
    });

    checkboxContainer.appendChild(label);
  });
}

export async function renderCountryStackedChart() {
  if (countryYearData.length === 0) {
    const response = await fetch("./data/launches_by_year_country.json");
    if (!response.ok) {
      throw new Error(`Failed to load country-year data: ${response.status}`);
    }
    countryYearData = await response.json();
  }

  const chartEl = document.getElementById("chart-launches-countries");
  if (!chartEl) {
    throw new Error("Could not find #chart-launches-countries");
  }

  const selectedCountries = appState.selectedCountries;
  const [minYear, maxYear] = appState.yearRange;

  const filtered = countryYearData.filter(row =>
    selectedCountries.includes(row.country) &&
    row.year >= minYear &&
    row.year <= maxYear
  );

  const years = Array.from(new Set(filtered.map(row => row.year))).sort((a, b) => a - b);

  const traces = selectedCountries.map(country => {
    const countryRows = filtered.filter(row => row.country === country);
    const countMap = new Map(countryRows.map(row => [row.year, row.count]));

    return {
      x: years,
      y: years.map(year => countMap.get(year) || 0),
      type: "bar",
      name: country,
      marker: {
        color: countryColorMap[country]
      },
      hovertemplate:
        "Year: %{x}<br>Country: " + country + "<br>Launches: %{y}<extra></extra>"
    };
  });

  Plotly.newPlot(
    chartEl,
    traces,
    {
      title: "Satellite Launches by Country Over Time",
      barmode: "stack",
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
        filename: "launches_by_country_stacked",
        scale: 2
      }
    }
  );
}