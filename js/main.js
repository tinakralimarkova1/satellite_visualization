import { appState } from "./state.js";
import { renderLaunchesChart } from "./launches.js";
import { initializeCountryFilter, renderCountryStackedChart } from "./launches-countries.js";
import { renderPurposeStackedChart } from "./launches-by-year-purpose.js";
import { renderGeoLaunchMap } from "./launches-geo.js";


function initializeYearSlider() {
  const sliderEl = document.getElementById("year-slider");
  const minLabel = document.getElementById("year-min-label");
  const maxLabel = document.getElementById("year-max-label");

  if (!sliderEl || !minLabel || !maxLabel) {
    throw new Error("Could not find year slider elements");
  }

  noUiSlider.create(sliderEl, {
    start: [1957, 2026],
    connect: true,
    step: 1,
    range: {
      min: 1957,
      max: 2026
    }
  });

  sliderEl.noUiSlider.on("update", async values => {
    const minYear = Math.round(values[0]);
    const maxYear = Math.round(values[1]);

    minLabel.textContent = minYear;
    maxLabel.textContent = maxYear;

    appState.yearRange = [minYear, maxYear];

    await renderLaunchesChart();
    await renderCountryStackedChart();
    await renderPurposeStackedChart();
    await renderGeoLaunchMap();


  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initializeYearSlider();

    await renderLaunchesChart();
    await initializeCountryFilter();
    await renderCountryStackedChart();
    await renderPurposeStackedChart();
    await renderGeoLaunchMap();



    const resetButton = document.getElementById("reset-filters");
    const sliderEl = document.getElementById("year-slider");

    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        if (sliderEl?.noUiSlider) {
          sliderEl.noUiSlider.set([1957, 2026]);
        }

        await initializeCountryFilter();
        await renderLaunchesChart();
        await renderCountryStackedChart();
        await renderPurposeStackedChart();
        await renderGeoLaunchMap();


      });
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});