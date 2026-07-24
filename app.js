const YEARS_TO_SHOW = 50;
const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];

const form = document.querySelector("#location-form");
const input = document.querySelector("#location-input");
const choices = document.querySelector("#place-choices");
const status = document.querySelector("#status");
const placeholder = document.querySelector("#chart-placeholder");
const dateRange = document.querySelector("#date-range");
const submitButton = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await findLocation(input.value.trim());
});

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setLoading(isLoading, message = "Fetching historical temperatures…") {
  submitButton.disabled = isLoading;
  placeholder.querySelector("span:last-child").textContent = message;
  placeholder.hidden = !isLoading;
}

function formatPlace(place) {
  return [place.name, place.admin1, place.country].filter((value, index, all) => value && all.indexOf(value) === index).join(", ");
}

async function findLocation(query, autoPick = false) {
  setLoading(true, "Finding that place…");
  choices.hidden = true;
  setStatus("");

  try {
    const params = new URLSearchParams({ name: query, count: "5", language: navigator.language.slice(0, 2), format: "json" });
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
    if (!response.ok) throw new Error(`Location search failed (${response.status})`);
    const { results = [] } = await response.json();
    if (!results.length) throw new Error("No matching places found. Try a nearby city or add the country.");

    if (autoPick || results.length === 1) {
      await loadClimate(results[0]);
      return;
    }

    renderChoices(results);
    setLoading(false);
    setStatus("Choose the matching place below.");
  } catch (error) {
    setLoading(false);
    setStatus(error.message, true);
  }
}

function renderChoices(results) {
  choices.replaceChildren();
  results.forEach((place) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = formatPlace(place);
    button.addEventListener("click", () => loadClimate(place));
    choices.append(button);
  });
  choices.hidden = false;
}

async function loadClimate(place) {
  choices.hidden = true;
  input.value = formatPlace(place);
  setLoading(true);
  setStatus("");

  const lastYear = new Date().getFullYear() - 1;
  const firstYear = lastYear - YEARS_TO_SHOW + 1;
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    start_date: `${firstYear}-01-01`,
    end_date: `${lastYear}-12-31`,
    daily: "temperature_2m_max",
    temperature_unit: "celsius",
    timezone: "auto",
    models: "era5_land"
  });

  try {
    const response = await fetch(`https://archive-api.open-meteo.com/v1/archive?${params}`);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.reason || `Weather request failed (${response.status})`);
    }
    const weather = await response.json();
    const grouped = groupByYear(weather.daily?.time || [], weather.daily?.temperature_2m_max || []);
    if (!grouped.size) throw new Error("No temperature data was returned for this location.");

    renderChart(grouped, place, firstYear, lastYear);
    dateRange.textContent = `${formatPlace(place)} · ${firstYear}–${lastYear}`;
    setStatus(`${weather.daily.time.length.toLocaleString()} daily observations loaded.`);
    setLoading(false);
  } catch (error) {
    setLoading(false);
    setStatus(error.message, true);
  }
}

function groupByYear(dates, temperatures) {
  const years = new Map();
  dates.forEach((date, index) => {
    const value = temperatures[index];
    if (!Number.isFinite(value)) return;
    const year = Number(date.slice(0, 4));
    if (!years.has(year)) years.set(year, []);
    years.get(year).push(value);
  });
  years.forEach((values) => values.sort((a, b) => a - b));
  return years;
}

function renderChart(grouped, place, firstYear, lastYear) {
  const traces = [...grouped.entries()].map(([year, values], index, all) => ({
    x: values,
    y: values.map((_, dayIndex) => dayIndex + 1),
    type: "scatter",
    mode: "lines",
    name: String(year),
    line: { color: viridisColor(index / Math.max(all.length - 1, 1)), width: year === lastYear ? 2.3 : 1.15, shape: "hv" },
    opacity: year === lastYear ? 1 : 0.72,
    hovertemplate: `<b>${year}</b><br>%{y} days ≤ %{x:.1f} °C<extra></extra>`,
    showlegend: false
  }));

  const layout = {
    margin: { l: 62, r: 22, t: 28, b: 60 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "DM Sans, sans-serif", color: "#607068", size: 12 },
    hovermode: "closest",
    xaxis: { title: "Daily maximum temperature (°C)", gridcolor: "#e4e3dc", zeroline: false, fixedrange: false },
    yaxis: { title: "Cumulative number of days", range: [0, 372], gridcolor: "#e4e3dc", zeroline: false, fixedrange: false },
    annotations: [{
      xref: "paper", yref: "paper", x: 1, y: 0.015, xanchor: "right", yanchor: "bottom",
      text: `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`, showarrow: false,
      font: { size: 10, color: "#7d8983" }
    }]
  };

  Plotly.react("chart", traces, layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] });
}

function viridisColor(position) {
  const scaled = Math.min(1, Math.max(0, position)) * (VIRIDIS.length - 1);
  const lower = Math.floor(scaled);
  const upper = Math.min(lower + 1, VIRIDIS.length - 1);
  const mix = scaled - lower;
  const a = VIRIDIS[lower].match(/\w\w/g).map((hex) => parseInt(hex, 16));
  const b = VIRIDIS[upper].match(/\w\w/g).map((hex) => parseInt(hex, 16));
  return `rgb(${a.map((channel, index) => Math.round(channel + (b[index] - channel) * mix)).join(",")})`;
}

window.addEventListener("DOMContentLoaded", () => findLocation("Madrid, Spain", true));
