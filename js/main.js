import { renderLaunchesChart } from "./launches.js";
import { initializeCountryFilter, renderCountryStackedChart } from "./purpose.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await renderLaunchesChart();
    await initializeCountryFilter();
    await renderCountryStackedChart();

    const resetButton = document.getElementById("reset-filters");
    if (resetButton) {
      resetButton.addEventListener("click", async () => {
        await initializeCountryFilter();
        await renderCountryStackedChart();
      });
    }
  } catch (error) {
    console.error("Error initializing app:", error);
  }
});