import { renderLaunchesChart } from "./launches.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await renderLaunchesChart();
  } catch (error) {
    console.error("Error rendering launches chart:", error);

    const chartEl = document.getElementById("chart-launches");
    if (chartEl) {
      chartEl.innerHTML = `
        <div style="
          display:flex;
          align-items:center;
          justify-content:center;
          height:100%;
          color:#6b7280;
          font-size:0.95rem;
          text-align:center;
          padding:20px;
        ">
          Failed to load chart data.
        </div>
      `;
    }
  }
});