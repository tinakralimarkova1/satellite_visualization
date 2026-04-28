import { appState } from "./state.js";

const MAX_SELECTED_COUNTRIES = 5;
const DEFAULT_COUNTRY_PANELS = ["United States", "China", "Russia"];
const PURPOSE_ORDER = ["Military", "Civil", "Commercial", "Academic", "Unknown"];
const PURPOSE_COLORS = {
  Academic: "#3b82f6",
  Commercial: "#f97316",
  Civil: "#22c55e",
  Military: "#ef4444",
  Unknown: "#94a3b8"
};

let countryPurposeData = [];
let countryTotals = new Map();
let allCountries = [];
let controlsInitialized = false;

async function loadCountryPurposeData() {
  if (countryPurposeData.length > 0) {
    return;
  }

  const response = await fetch("./data/launches_by_year_country_purpose.json");
  if (!response.ok) {
    throw new Error(`Failed to load country-purpose data: ${response.status}`);
  }

  countryPurposeData = await response.json();

  countryTotals = new Map();
  countryPurposeData.forEach(row => {
    countryTotals.set(row.country, (countryTotals.get(row.country) || 0) + row.count);
  });

  allCountries = Array.from(countryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([country]) => country);
}

function getDefaultSelectedCountries() {
  const preferred = DEFAULT_COUNTRY_PANELS.filter(country => allCountries.includes(country));
  if (preferred.length > 0) {
    return preferred.slice(0, MAX_SELECTED_COUNTRIES);
  }

  return allCountries.slice(0, Math.min(3, MAX_SELECTED_COUNTRIES));
}

function ensureSelectedCountries(useDefaults = false) {
  if (!Array.isArray(appState.selectedCountryPanels)) {
    appState.selectedCountryPanels = [];
  }

  appState.selectedCountryPanels = appState.selectedCountryPanels
    .filter(country => allCountries.includes(country))
    .slice(0, MAX_SELECTED_COUNTRIES);

  if (useDefaults && appState.selectedCountryPanels.length === 0) {
    appState.selectedCountryPanels = getDefaultSelectedCountries();
  }
}

function getFilteredCountryData() {
  const [minYear, maxYear] = appState.yearRange;

  return countryPurposeData.filter(
    row => row.year >= minYear && row.year <= maxYear
  );
}

function renderSelectedCountryPills() {
  const container = document.getElementById("country-profile-selected");
  const helper = document.getElementById("country-profile-helper");
  if (!container || !helper) {
    return;
  }

  const selectedCountries = appState.selectedCountryPanels || [];
  container.innerHTML = "";

  if (selectedCountries.length === 0) {
    container.innerHTML = `<p class="country-profile-empty">Click a country on the map or add one above.</p>`;
  } else {
    selectedCountries.forEach(country => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "country-pill";
      pill.innerHTML = `<span>${country}</span><span class="country-pill-remove">×</span>`;
      pill.addEventListener("click", async () => {
        removeCountry(country);
        await renderCountryLaunchProfiles();
      });
      container.appendChild(pill);
    });
  }

  helper.textContent = `${selectedCountries.length}/${MAX_SELECTED_COUNTRIES} countries selected`;
}

function renderPurposeLegend() {
  const container = document.getElementById("country-profile-purpose-legend");
  if (!container) {
    return;
  }

  container.innerHTML = PURPOSE_ORDER.map(purpose => `
    <div class="purpose-legend-item">
      <span
        class="purpose-legend-swatch"
        style="background:${PURPOSE_COLORS[purpose] || "#94a3b8"}"
      ></span>
      <span>${purpose}</span>
    </div>
  `).join("");
}

function addCountry(country) {
  if (!country || !allCountries.includes(country)) {
    return false;
  }

  if (appState.selectedCountryPanels.includes(country)) {
    return true;
  }

  if (appState.selectedCountryPanels.length >= MAX_SELECTED_COUNTRIES) {
    return false;
  }

  appState.selectedCountryPanels = [...appState.selectedCountryPanels, country];
  return true;
}

function removeCountry(country) {
  appState.selectedCountryPanels = appState.selectedCountryPanels.filter(item => item !== country);
}

function toggleCountry(country) {
  if (appState.selectedCountryPanels.includes(country)) {
    removeCountry(country);
    return true;
  }

  return addCountry(country);
}

function initializeControls() {
  if (controlsInitialized) {
    return;
  }

  const searchInput = document.getElementById("country-profile-search");
  const addButton = document.getElementById("country-profile-add-button");
  const clearButton = document.getElementById("country-profile-clear-button");
  const datalist = document.getElementById("country-profile-options");

  if (!searchInput || !addButton || !clearButton || !datalist) {
    throw new Error("Could not find country profile controls");
  }

  datalist.innerHTML = allCountries
    .map(country => `<option value="${country}"></option>`)
    .join("");

  const tryAddCountry = async () => {
    const rawValue = searchInput.value.trim();
    const matchedCountry = allCountries.find(
      country => country.toLowerCase() === rawValue.toLowerCase()
    );

    if (!matchedCountry) {
      searchInput.setCustomValidity("Choose a country from the list.");
      searchInput.reportValidity();
      return;
    }

    if (!addCountry(matchedCountry)) {
      searchInput.setCustomValidity(`You can compare up to ${MAX_SELECTED_COUNTRIES} countries.`);
      searchInput.reportValidity();
      return;
    }

    searchInput.setCustomValidity("");
    searchInput.value = "";
    await renderCountryLaunchProfiles();
  };

  addButton.addEventListener("click", tryAddCountry);
  searchInput.addEventListener("keydown", async event => {
    if (event.key === "Enter") {
      event.preventDefault();
      await tryAddCountry();
    }
  });
  searchInput.addEventListener("input", () => {
    searchInput.setCustomValidity("");
  });

  clearButton.addEventListener("click", async () => {
    appState.selectedCountryPanels = [];
    await renderCountryLaunchProfiles();
  });

  controlsInitialized = true;
}

function buildMapTrace(filteredData) {
  const filteredTotals = new Map();

  filteredData.forEach(row => {
    filteredTotals.set(row.country, (filteredTotals.get(row.country) || 0) + row.count);
  });

  const selectedCountries = appState.selectedCountryPanels || [];

  return {
    type: "choropleth",
    locationmode: "country names",
    locations: Array.from(filteredTotals.keys()),
    z: Array.from(filteredTotals.values()),
    text: Array.from(filteredTotals.keys()),
    customdata: Array.from(filteredTotals.keys()).map(country => [
      selectedCountries.includes(country)
    ]),
    colorscale: [
      [0, "#dbeafe"],
      [0.35, "#93c5fd"],
      [0.7, "#3b82f6"],
      [1, "#1d4ed8"]
    ],
    marker: {
      line: {
        color: "#ffffff",
        width: 0.7
      }
    },
    colorbar: {
      title: "Launches"
    },
    hovertemplate: "Country: %{text}<br>Launches: %{z}<extra></extra>"
  };
}

async function renderMap(filteredData) {
  const chartEl = document.getElementById("chart-country-profiles-map");
  if (!chartEl) {
    throw new Error("Could not find #chart-country-profiles-map");
  }

  const [minYear, maxYear] = appState.yearRange;
  const mapTrace = buildMapTrace(filteredData);
  const selectedCountries = appState.selectedCountryPanels || [];

  await Plotly.newPlot(
    chartEl,
    [mapTrace],
    {
      title: `Launches by Country (${minYear}–${maxYear})`,
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      margin: { t: 56, r: 24, b: 12, l: 24 },
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
        coastlinecolor: "#cbd5e1",
        showcountries: true,
        countrycolor: "#ffffff",
        bgcolor: "white"
      }
    },
    {
      responsive: true,
      displaylogo: false,
      toImageButtonOptions: {
        format: "png",
        filename: "country_launch_profiles_map",
        scale: 2
      }
    }
  );

  if (typeof chartEl.removeAllListeners === "function") {
    chartEl.removeAllListeners("plotly_click");
  }

  chartEl.on("plotly_click", async event => {
    const clickedCountry = event?.points?.[0]?.location;
    if (!clickedCountry) {
      return;
    }

    const didToggle = toggleCountry(clickedCountry);
    if (!didToggle && !appState.selectedCountryPanels.includes(clickedCountry)) {
      const helper = document.getElementById("country-profile-helper");
      if (helper) {
        helper.textContent = `You can compare up to ${MAX_SELECTED_COUNTRIES} countries at once.`;
      }
      return;
    }

    await renderCountryLaunchProfiles();
  });
}

function buildCountryChartLayout(country, selectionCount) {
  return {
    barmode: "stack",
    paper_bgcolor: "white",
    plot_bgcolor: "white",
    margin: {
      t: 52,
      r: 18,
      b: selectionCount === 1 ? 56 : 46,
      l: selectionCount === 1 ? 64 : 48
    },
    font: {
      family: "Inter, Arial, sans-serif",
      color: "#1f2937"
    },
    showlegend: false,
    title: {
      text: country,
      x: 0.02,
      xanchor: "left",
      font: {
        size: selectionCount === 1 ? 24 : 18
      }
    },
    xaxis: {
      title: selectionCount === 1 ? "Year" : "",
      type: "category",
      tickangle: selectionCount >= 4 ? -60 : -45,
      tickfont: {
        size: selectionCount === 1 ? 11 : 9
      },
      gridcolor: "#eef2ff"
    },
    yaxis: {
      title: selectionCount === 1 ? "Launches" : "",
      tickfont: {
        size: selectionCount === 1 ? 11 : 9
      },
      gridcolor: "#e5e7eb"
    }
  };
}

async function renderCountryPanels(filteredData) {
  const grid = document.getElementById("country-profile-grid");
  if (!grid) {
    throw new Error("Could not find #country-profile-grid");
  }

  const selectedCountries = appState.selectedCountryPanels || [];
  grid.innerHTML = "";
  grid.dataset.count = String(selectedCountries.length);

  if (selectedCountries.length === 0) {
    grid.innerHTML = `
      <div class="country-profile-placeholder">
        <h3>No countries selected</h3>
        <p>Click a country on the map or add one with the country picker to build this comparison view.</p>
      </div>
    `;
    return;
  }

  const years = Array.from(new Set(filteredData.map(row => row.year))).sort((a, b) => a - b);

  for (const country of selectedCountries) {
    const panel = document.createElement("article");
    panel.className = "country-profile-panel";
    panel.innerHTML = `
      <div class="country-profile-chart" id="country-profile-chart-${country.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}"></div>
    `;
    grid.appendChild(panel);

    const chartEl = panel.querySelector(".country-profile-chart");
    const countryRows = filteredData.filter(row => row.country === country);
    const purposes = PURPOSE_ORDER.filter(purpose =>
      countryRows.some(row => row.purpose === purpose)
    );

    const traces = purposes.map(purpose => {
      const purposeRows = countryRows.filter(row => row.purpose === purpose);
      const countMap = new Map(purposeRows.map(row => [row.year, row.count]));

      return {
        x: years,
        y: years.map(year => countMap.get(year) || 0),
        type: "bar",
        name: purpose,
        marker: {
          color: PURPOSE_COLORS[purpose] || "#94a3b8"
        },
        hovertemplate: `Country: ${country}<br>Year: %{x}<br>Purpose: ${purpose}<br>Launches: %{y}<extra></extra>`
      };
    });

    await Plotly.newPlot(
      chartEl,
      traces,
      buildCountryChartLayout(country, selectedCountries.length),
      {
        responsive: true,
        displaylogo: false,
        modeBarButtonsToRemove: ["lasso2d", "select2d"],
        toImageButtonOptions: {
          format: "png",
          filename: `${country.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_launch_profile`,
          scale: 2
        }
      }
    );
  }
}

export async function initializeCountryLaunchProfiles() {
  await loadCountryPurposeData();
  ensureSelectedCountries(true);
  initializeControls();
}

export async function renderCountryLaunchProfiles() {
  await loadCountryPurposeData();
  ensureSelectedCountries();

  const filteredData = getFilteredCountryData();

  renderPurposeLegend();
  renderSelectedCountryPills();
  await renderMap(filteredData);
  await renderCountryPanels(filteredData);
}
