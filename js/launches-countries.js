import { appState } from "./state.js?v=20260701";

let countryYearData = [];
let countryColorMap = {};
let allCountries = [];

const TOP_COUNTRY_COUNT = 8;
const OTHER_LABEL = "Other";
const OTHER_COLOR = "#9ca3af";
const COUNTRY_COLORS = {
  "United States": "#2563eb",
  Russia: "#dc2626",
  China: "#eab308",
  "United Kingdom": "#7c3aed",
  Japan: "#db2777",
  France: "#0891b2",
  India: "#f97316",
  Germany: "#334155"
};
const COUNTRY_MAP = {
  US: "United States",
  PRC: "China",
  RU: "Russia",
  SU: "Russia",   // 👈 merge Soviet Union into Russia
  IND: "India",
  JPN: "Japan",
  ESA: "European Space Agency",
  FRA: "France",
  UK: "United Kingdom",
  GER: "Germany",
  CAN: "Canada",
  ITA: "Italy",
  ISR: "Israel",
  IRN: "Iran",
  KOR: "South Korea",
  BRA: "Brazil"
};

function normalizeCountry(code) {
  return COUNTRY_MAP[code] || code;
}

function generateColorMap(countries) {
  const palette = [
    "#059669", "#4f46e5", "#c2410c", "#0d9488",
    "#9333ea", "#65a30d", "#be123c", "#0284c7"
  ];

  let fallbackIndex = 0;

  countries.forEach(country => {
    if (!countryColorMap[country]) {
      countryColorMap[country] = COUNTRY_COLORS[country]
        || palette[fallbackIndex++ % palette.length];
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

  countryYearData = (await response.json()).map(row => ({
    ...row,
    country: normalizeCountry(row.country)
  }));

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

  // Default to the eight countries with the highest all-time launch totals.
  const defaultCountries = allCountries.slice(0, TOP_COUNTRY_COUNT);
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
    countryYearData = (await response.json()).map(row => ({
      ...row,
      country: normalizeCountry(row.country)
    }));
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
        "Year: %{x}<br>Owner country: " + country + "<br>Satellites launched: %{y}<extra></extra>"
    });
  });

  // Combine every country outside the selected top eight into one series.
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
        "Year: %{x}<br>Owner country: Other<br>Satellites launched: %{y}<extra></extra>"
    });
  }

  Plotly.newPlot(
    chartEl,
    traces,
    {
      title: "Satellites Launched by Owner Country Over Time",
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
        traceorder: "normal"
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "satellites_launched_by_owner_country",
        scale: 2
      }
    }
  );
}
