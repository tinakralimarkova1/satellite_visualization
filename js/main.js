import { appState } from "./state.js?v=20260701";
import { renderLaunchesChart } from "./launches.js?v=20260701";
import { initializeCountryFilter, renderCountryStackedChart } from "./launches-countries.js?v=20260701";
import { renderPurposeStackedChart } from "./launches-by-year-purpose.js?v=20260701";
import { renderGeoLaunchMap } from "./launches-geo.js?v=20260701";
import {
  initializeCountryLaunchProfiles,
  renderCountryLaunchProfiles
} from "./country-launch-profiles.js?v=20260701";


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
    await renderCountryLaunchProfiles();


  });
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    initializeYearSlider();

    await renderLaunchesChart();
    await initializeCountryFilter();
    await initializeCountryLaunchProfiles();
    await renderCountryStackedChart();
    await renderPurposeStackedChart();
    await renderGeoLaunchMap();
    await renderCountryLaunchProfiles();



    const resetButton = document.getElementById("reset-filters");
    const sliderEl = document.getElementById("year-slider");

    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        if (sliderEl?.noUiSlider) {
          sliderEl.noUiSlider.set([1957, 2026]);
        }

        await initializeCountryFilter();
        await initializeCountryLaunchProfiles();
        await renderLaunchesChart();
        await renderCountryStackedChart();
        await renderPurposeStackedChart();
        await renderGeoLaunchMap();
        await renderCountryLaunchProfiles();


      });
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});
