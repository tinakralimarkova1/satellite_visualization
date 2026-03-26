import { appState } from "./state.js";

let countryYearData = [];
let countryColorMap = {};
let allCountries = [];

const OTHER_LABEL = "Other";
const OTHER_COLOR = "#9ca3af";

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

  countryColorMap[OTHER_LABEL] = OTHER_COLOR;
}

function getCheckedCountries(container) {
  return Array.from(container.querySelectorAll('input[type="checkbox"]:checked'))
    .map(input => input.value);
}

function renderCountryCheckboxes(container, countries, selectedCountries) {
  container.innerHTML = "";

  countries.forEach(country => {
    const label = document.createElement("label");
    label.className = "country-option";

    label.innerHTML = `
      <input type="checkbox" value="${country}" ${selectedCountries.includes(country) ? "checked" : ""} />
      <span>${country}</span>
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", async () => {
      appState.selectedCountries = getCheckedCountries(container);
      await renderCountryStackedChart();
    });

    container.appendChild(label);
  });
}

export async function initializeCountryFilter() {
  const response = await fetch("./data/launches_by_year_country.json");
  if (!response.ok) {
    throw new Error(`Failed to load country-year data: ${response.status}`);
  }

  countryYearData = await response.json();

  const checkboxContainer = document.getElementById("country-checkboxes");
  const controlsContainer = document.getElementById("country-filter-controls");

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

  allCountries = [...sortedCountries];

  generateColorMap(allCountries);

  // default = top 8 only
  const defaultCountries = allCountries.slice(0, 8);
  appState.selectedCountries = [...defaultCountries];

  if (controlsContainer) {
    controlsContainer.innerHTML = `
      <input
        type="text"
        id="country-search"
        placeholder="Search countries..."
      />
      <div class="country-filter-buttons">
        <button id="select-all-countries" type="button">Select All</button>
        <button id="deselect-all-countries" type="button">Deselect All</button>
      </div>
    `;

    const searchInput = document.getElementById("country-search");
    const selectAllBtn = document.getElementById("select-all-countries");
    const deselectAllBtn = document.getElementById("deselect-all-countries");

    renderCountryCheckboxes(
      checkboxContainer,
      allCountries,
      appState.selectedCountries
    );

    searchInput.addEventListener("input", () => {
      const query = searchInput.value.trim().toLowerCase();

      const filteredCountries = allCountries.filter(country =>
        country.toLowerCase().includes(query)
      );

      renderCountryCheckboxes(
        checkboxContainer,
        filteredCountries,
        appState.selectedCountries
      );
    });

    selectAllBtn.addEventListener("click", async () => {
      appState.selectedCountries = [...allCountries];

      const query = searchInput.value.trim().toLowerCase();
      const filteredCountries = allCountries.filter(country =>
        country.toLowerCase().includes(query)
      );

      renderCountryCheckboxes(
        checkboxContainer,
        filteredCountries,
        appState.selectedCountries
      );

      await renderCountryStackedChart();
    });

    deselectAllBtn.addEventListener("click", async () => {
      appState.selectedCountries = [];

      const query = searchInput.value.trim().toLowerCase();
      const filteredCountries = allCountries.filter(country =>
        country.toLowerCase().includes(query)
      );

      renderCountryCheckboxes(
        checkboxContainer,
        filteredCountries,
        appState.selectedCountries
      );

      await renderCountryStackedChart();
    });
  } else {
    renderCountryCheckboxes(
      checkboxContainer,
      allCountries,
      appState.selectedCountries
    );
  }
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

  const selectedCountries = appState.selectedCountries || [];
  const [minYear, maxYear] = appState.yearRange;

  const yearFiltered = countryYearData.filter(row =>
    row.year >= minYear && row.year <= maxYear
  );

  const years = Array.from(
    new Set(yearFiltered.map(row => row.year))
  ).sort((a, b) => a - b);

  const traces = [];

  // Selected country traces
  selectedCountries.forEach(country => {
    const countryRows = yearFiltered.filter(row => row.country === country);
    const countMap = new Map(countryRows.map(row => [row.year, row.count]));

    traces.push({
      x: years,
      y: years.map(year => countMap.get(year) || 0),
      type: "bar",
      name: country,
      marker: {
        color: countryColorMap[country]
      },
      hovertemplate:
        "Year: %{x}<br>Country: " + country + "<br>Launches: %{y}<extra></extra>"
    });
  });

  // Other trace = all unselected countries combined
  const unselectedCountries = allCountries.filter(
    country => !selectedCountries.includes(country)
  );

  if (unselectedCountries.length > 0) {
    const otherRows = yearFiltered.filter(row =>
      unselectedCountries.includes(row.country)
    );

    const otherCountMap = new Map();

    otherRows.forEach(row => {
      otherCountMap.set(
        row.year,
        (otherCountMap.get(row.year) || 0) + row.count
      );
    });

    traces.push({
      x: years,
      y: years.map(year => otherCountMap.get(year) || 0),
      type: "bar",
      name: OTHER_LABEL,
      marker: {
        color: OTHER_COLOR
      },
      hovertemplate:
        "Year: %{x}<br>Country: Other<br>Launches: %{y}<extra></extra>"
    });
  }

  Plotly.newPlot(
    chartEl,
    traces,
    {
      title: "Satellite Launches by Country Over Time",
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
        filename: "launches_by_country_stacked",
        scale: 2
      }
    }
  );
}