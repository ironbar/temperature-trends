const YEARS_TO_SHOW = 50;
const VIRIDIS = ["#440154", "#482878", "#3e4989", "#31688e", "#26828e", "#1f9e89", "#35b779", "#6ece58", "#b5de2b", "#fde725"];

const form = document.querySelector("#location-form");
const input = document.querySelector("#location-input");
const choices = document.querySelector("#place-choices");
const status = document.querySelector("#status");
const placeholders = document.querySelectorAll(".chart-placeholder");
const dateRanges = document.querySelectorAll(".date-range");
const startYearLabels = document.querySelectorAll(".legend-start-year");
const endYearLabels = document.querySelectorAll(".legend-end-year");
const submitButton = form.querySelector("button");
const smoothingInput = document.querySelector("#year-window");
const smoothingOutput = document.querySelector("#year-window-value");
const startYearInput = document.querySelector("#start-year");
const endYearInput = document.querySelector("#end-year");
const selectedYearsOutput = document.querySelector("#selected-years");
const yearRangeSlider = document.querySelector("#year-range-slider");
const latestYearLabel = document.querySelector(".latest-year-label");
const displayStartYearInput = document.querySelector("#display-start-year");
const displayEndYearInput = document.querySelector("#display-end-year");
const displayedYearsOutput = document.querySelector("#displayed-years");
const displayYearSlider = document.querySelector("#display-year-slider");
const displayFirstYearLabel = document.querySelector(".display-first-year");
const displayLastYearLabel = document.querySelector(".display-last-year");
const smoothingTicks = document.querySelectorAll(".range-ticks span");
const trendTemperatureInputs = document.querySelectorAll(".trend-temperature");
let loadedClimate = null;

const latestCompleteYear = new Date().getFullYear() - 1;
startYearInput.max = latestCompleteYear;
endYearInput.max = latestCompleteYear;
startYearInput.value = latestCompleteYear - YEARS_TO_SHOW + 1;
endYearInput.value = latestCompleteYear;
latestYearLabel.textContent = latestCompleteYear;
updateYearRange("start");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    selectedYearRange();
  } catch (error) {
    setStatus(error.message, true);
    return;
  }
  const query = input.value.trim();
  if (loadedClimate && query === formatPlace(loadedClimate.place)) await loadClimate(loadedClimate.place);
  else await findLocation(query);
});

smoothingInput.addEventListener("input", () => {
  updateSmoothingLabel();
  if (!loadedClimate) return;
  renderLoadedClimate();
  setStatus("Plots updated locally — no new weather data downloaded.");
});

startYearInput.addEventListener("input", () => updateYearRange("start"));
endYearInput.addEventListener("input", () => updateYearRange("end"));
displayStartYearInput.addEventListener("input", () => updateDisplayYearRange("start", true));
displayEndYearInput.addEventListener("input", () => updateDisplayYearRange("end", true));
trendTemperatureInputs.forEach((temperatureInput) => {
  temperatureInput.addEventListener("input", () => {
    if (!loadedClimate || !temperatureInput.validity.valid || temperatureInput.value === "") return;
    renderTrendChartsForLoadedClimate();
    setStatus("Trend plots updated locally — no new weather data downloaded.");
  });
});

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setLoading(isLoading, message = "Fetching historical temperatures…") {
  submitButton.disabled = isLoading;
  smoothingInput.disabled = isLoading || !loadedClimate || Number(smoothingInput.max) === 1;
  displayStartYearInput.disabled = isLoading || !loadedClimate;
  displayEndYearInput.disabled = isLoading || !loadedClimate;
  trendTemperatureInputs.forEach((temperatureInput) => {
    temperatureInput.disabled = isLoading || !loadedClimate;
  });
  placeholders.forEach((placeholder) => {
    placeholder.querySelector("span:last-child").textContent = message;
    placeholder.hidden = !isLoading;
  });
}

function selectedYearRange() {
  const firstYear = Number(startYearInput.value);
  const lastYear = Number(endYearInput.value);
  if (!Number.isInteger(firstYear) || !Number.isInteger(lastYear)) throw new Error("Enter a valid start and end year.");
  if (firstYear < 1950 || lastYear > latestCompleteYear) {
    throw new Error(`Choose years between 1950 and ${latestCompleteYear}.`);
  }
  if (firstYear > lastYear) throw new Error("The start year must not be later than the end year.");
  return { firstYear, lastYear };
}

function updateYearRange(changedHandle) {
  let firstYear = Number(startYearInput.value);
  let lastYear = Number(endYearInput.value);
  if (firstYear > lastYear) {
    if (changedHandle === "start") {
      firstYear = lastYear;
      startYearInput.value = firstYear;
    } else {
      lastYear = firstYear;
      endYearInput.value = lastYear;
    }
  }

  selectedYearsOutput.textContent = `${firstYear}–${lastYear}`;
  setRangeGradient(yearRangeSlider, firstYear, lastYear, 1950, latestCompleteYear);
}

function setRangeGradient(element, firstYear, lastYear, minimum, maximum) {
  const fullSpan = maximum - minimum;
  const startPercent = fullSpan === 0 ? 0 : ((firstYear - minimum) / fullSpan) * 100;
  const endPercent = fullSpan === 0 ? 100 : ((lastYear - minimum) / fullSpan) * 100;
  element.style.setProperty("--range-gradient", `linear-gradient(to right, #cdd2cd 0%, #cdd2cd ${startPercent}%, var(--accent) ${startPercent}%, var(--accent) ${endPercent}%, #cdd2cd ${endPercent}%, #cdd2cd 100%)`);
}

function resetDisplayYearRange(firstYear, lastYear) {
  displayStartYearInput.min = firstYear;
  displayStartYearInput.max = lastYear;
  displayEndYearInput.min = firstYear;
  displayEndYearInput.max = lastYear;
  displayStartYearInput.value = firstYear;
  displayEndYearInput.value = lastYear;
  displayFirstYearLabel.textContent = firstYear;
  displayLastYearLabel.textContent = lastYear;
  updateDisplayYearRange("start", false);
}

function updateDisplayYearRange(changedHandle, shouldRender) {
  let firstYear = Number(displayStartYearInput.value);
  let lastYear = Number(displayEndYearInput.value);
  if (firstYear > lastYear) {
    if (changedHandle === "start") {
      firstYear = lastYear;
      displayStartYearInput.value = firstYear;
    } else {
      lastYear = firstYear;
      displayEndYearInput.value = lastYear;
    }
  }

  displayedYearsOutput.textContent = `${firstYear}–${lastYear}`;
  setRangeGradient(displayYearSlider, firstYear, lastYear, Number(displayStartYearInput.min), Number(displayStartYearInput.max));

  if (shouldRender && loadedClimate) {
    updateSmoothingOptions(lastYear - firstYear + 1);
    renderLoadedClimate();
    setStatus("Plots updated locally — no new weather data downloaded.");
  }
}

function updateSmoothingLabel() {
  const windowSize = Number(smoothingInput.value);
  smoothingOutput.textContent = windowSize === 1 ? "No averaging" : `${windowSize}-year average`;
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

  const { firstYear, lastYear } = selectedYearRange();
  const params = new URLSearchParams({
    latitude: place.latitude,
    longitude: place.longitude,
    start_date: `${firstYear}-01-01`,
    end_date: `${lastYear}-12-31`,
    daily: "temperature_2m_max,temperature_2m_min",
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
    const maximums = groupByYear(weather.daily?.time || [], weather.daily?.temperature_2m_max || []);
    const minimums = groupByYear(weather.daily?.time || [], weather.daily?.temperature_2m_min || []);
    if (!maximums.size || !minimums.size) throw new Error("No temperature data was returned for this location.");

    loadedClimate = {
      maximums,
      minimums,
      place,
      firstYear,
      lastYear,
      observationCount: weather.daily.time.length
    };
    resetDisplayYearRange(firstYear, lastYear);
    updateSmoothingOptions(maximums.size);
    renderLoadedClimate();
    setStatus(`${loadedClimate.observationCount.toLocaleString()} daily observations loaded.`);
    setLoading(false);
  } catch (error) {
    setLoading(false);
    setStatus(error.message, true);
  }
}

function updateSmoothingOptions(yearCount) {
  const maximumWindow = Math.min(11, yearCount % 2 === 0 ? yearCount - 1 : yearCount);
  smoothingInput.max = Math.max(1, maximumWindow);
  if (Number(smoothingInput.value) > maximumWindow) smoothingInput.value = Math.max(1, maximumWindow);
  updateSmoothingLabel();

  smoothingTicks.forEach((tick) => {
    const value = Number(tick.textContent);
    const isAvailable = value <= maximumWindow;
    tick.hidden = !isAvailable;
    if (isAvailable) {
      const position = maximumWindow === 1 ? 50 : ((value - 1) / (maximumWindow - 1)) * 100;
      tick.style.left = `${position}%`;
    }
  });
}

function renderLoadedClimate() {
  const { maximums, minimums, place } = loadedClimate;
  const displayFirstYear = Number(displayStartYearInput.value);
  const displayLastYear = Number(displayEndYearInput.value);
  const windowSize = Number(smoothingInput.value);
  const visibleMaximums = filterYearRange(maximums, displayFirstYear, displayLastYear);
  const visibleMinimums = filterYearRange(minimums, displayFirstYear, displayLastYear);
  const averagedMaximums = centeredYearWindows(visibleMaximums, windowSize);
  const averagedMinimums = centeredYearWindows(visibleMinimums, windowSize);
  const shownYears = [...averagedMaximums.keys()];
  const firstShownYear = shownYears[0];
  const lastShownYear = shownYears[shownYears.length - 1];

  renderChart("maximum-chart", averagedMaximums, place, lastShownYear, {
    direction: "above",
    xTitle: "Daily maximum air temperature at 2 m above ground (°C)",
    yTitle: windowSize === 1 ? "Days at or above temperature" : "Average days at or above temperature",
    windowSize
  });
  renderChart("minimum-chart", averagedMinimums, place, lastShownYear, {
    direction: "below",
    xTitle: "Daily minimum air temperature at 2 m above ground (°C)",
    yTitle: windowSize === 1 ? "Days at or below temperature" : "Average days at or below temperature",
    windowSize
  });
  renderTrendCharts(averagedMaximums, windowSize);
  const period = windowSize === 1
    ? `${firstShownYear}–${lastShownYear}`
    : `${windowSize}-year averages · ${firstShownYear}–${lastShownYear}`;
  dateRanges.forEach((element) => { element.textContent = `${formatPlace(place)} · ${period}`; });
  startYearLabels.forEach((label) => { label.textContent = firstShownYear; });
  endYearLabels.forEach((label) => { label.textContent = lastShownYear; });
}

function renderTrendChartsForLoadedClimate() {
  const displayFirstYear = Number(displayStartYearInput.value);
  const displayLastYear = Number(displayEndYearInput.value);
  const windowSize = Number(smoothingInput.value);
  const visibleMaximums = filterYearRange(loadedClimate.maximums, displayFirstYear, displayLastYear);
  renderTrendCharts(centeredYearWindows(visibleMaximums, windowSize), windowSize);
}

function filterYearRange(grouped, firstYear, lastYear) {
  return new Map([...grouped.entries()].filter(([year]) => year >= firstYear && year <= lastYear));
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

function centeredYearWindows(grouped, windowSize) {
  const entries = [...grouped.entries()];
  const halfWindow = Math.floor(windowSize / 2);
  const windows = new Map();
  for (let index = halfWindow; index < entries.length - halfWindow; index += 1) {
    const year = entries[index][0];
    const selected = entries.slice(index - halfWindow, index + halfWindow + 1);
    const isContinuous = selected[selected.length - 1][0] - selected[0][0] === windowSize - 1;
    if (isContinuous) windows.set(year, selected.map(([, values]) => values));
  }
  return windows;
}

function lowerBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function upperBound(values, target) {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] <= target) low = middle + 1;
    else high = middle;
  }
  return low;
}

function cumulativeSeries(years, direction) {
  const temperatures = [...new Set(years.flat())].sort((a, b) => a - b);
  const days = temperatures.map((temperature) => {
    const total = years.reduce((sum, values) => {
      const count = direction === "above"
        ? values.length - lowerBound(values, temperature)
        : upperBound(values, temperature);
      return sum + count;
    }, 0);
    return total / years.length;
  });
  return { temperatures, days };
}

function countDaysAtOrAbove(years, temperature) {
  return years.reduce(
    (total, values) => total + values.length - lowerBound(values, temperature),
    0
  ) / years.length;
}

function linearRegression(x, y) {
  const meanX = x.reduce((sum, value) => sum + value, 0) / x.length;
  const meanY = y.reduce((sum, value) => sum + value, 0) / y.length;
  const xVariance = x.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const covariance = x.reduce((sum, value, index) => sum + (value - meanX) * (y[index] - meanY), 0);
  const slope = xVariance === 0 ? 0 : covariance / xVariance;
  const intercept = meanY - slope * meanX;
  const predicted = x.map((value) => intercept + slope * value);
  const totalVariation = y.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  const residualVariation = y.reduce((sum, value, index) => sum + (value - predicted[index]) ** 2, 0);
  const rSquared = totalVariation < Number.EPSILON ? null : Math.max(0, Math.min(1, 1 - residualVariation / totalVariation));
  return { slope, intercept, predicted, rSquared };
}

function renderTrendCharts(grouped, windowSize) {
  const entries = [...grouped.entries()];
  if (!entries.length) return;
  const years = entries.map(([year]) => year);
  const firstYear = years[0];
  const lastYear = years[years.length - 1];

  trendTemperatureInputs.forEach((temperatureInput, index) => {
    const temperature = Number(temperatureInput.value);
    if (!Number.isFinite(temperature)) return;
    const days = entries.map(([, yearGroups]) => countDaysAtOrAbove(yearGroups, temperature));
    const regression = linearRegression(years, days);
    const rSquaredLabel = regression.rSquared === null ? "R² = —" : `R² = ${regression.rSquared.toFixed(3)}`;
    const slopeLabel = `Slope = ${regression.slope >= 0 ? "+" : ""}${regression.slope.toFixed(2)} days/year`;
    const averageLabel = windowSize === 1 ? "Days" : "Average days";
    const traces = [
      {
        x: years,
        y: days,
        type: "scatter",
        mode: "markers",
        name: "Year",
        marker: {
          color: years.map((year) => viridisColor((year - firstYear) / Math.max(lastYear - firstYear, 1))),
          size: 7,
          line: { color: "rgba(255,255,255,0.8)", width: 0.7 }
        },
        hovertemplate: `<b>%{x}</b><br>%{y:.1f} days ≥ ${temperature} °C<extra></extra>`
      },
      {
        x: [firstYear, lastYear],
        y: [regression.predicted[0], regression.predicted[regression.predicted.length - 1]],
        type: "scatter",
        mode: "lines",
        name: "Linear trend",
        line: { color: "#285448", width: 2.5 },
        hovertemplate: "Linear trend<br>%{y:.1f} days<extra></extra>"
      }
    ];
    const layout = {
      margin: { l: 51, r: 12, t: 53, b: 48 },
      paper_bgcolor: "rgba(0,0,0,0)",
      plot_bgcolor: "rgba(0,0,0,0)",
      font: { family: "DM Sans, sans-serif", color: "#607068", size: 11 },
      showlegend: false,
      hovermode: "closest",
      xaxis: { title: "Year", dtick: Math.max(1, Math.ceil((lastYear - firstYear) / 4)), gridcolor: "#e4e3dc", zeroline: false },
      yaxis: { title: `${averageLabel} ≥ ${temperature} °C`, autorange: true, gridcolor: "#e4e3dc", zeroline: false },
      annotations: [{
        xref: "paper", yref: "paper", x: 0.02, y: 1.13, xanchor: "left", yanchor: "top",
        text: `<b>${slopeLabel}</b><br>${rSquaredLabel}`, showarrow: false,
        font: { size: 13, color: "#285448" }, bgcolor: "rgba(237,241,235,0.9)", borderpad: 5
      }]
    };
    Plotly.react(`trend-chart-${index + 1}`, traces, layout, {
      responsive: true,
      displaylogo: false,
      modeBarButtonsToRemove: ["lasso2d", "select2d"]
    });
  });
}

function renderChart(elementId, grouped, place, lastYear, options) {
  const comparison = options.direction === "above" ? "≥" : "≤";
  const traces = [...grouped.entries()].map(([year, years], index, all) => {
    const series = cumulativeSeries(years, options.direction);
    const halfWindow = Math.floor(options.windowSize / 2);
    const periodLabel = options.windowSize === 1
      ? `<b>${year}</b>`
      : `<b>${year - halfWindow}–${year + halfWindow} average</b><br>Centred on ${year}`;
    return {
      x: series.temperatures,
      y: series.days,
      type: "scatter",
      mode: "lines",
      name: String(year),
      line: { color: viridisColor(index / Math.max(all.length - 1, 1)), width: year === lastYear ? 2.3 : 1.15, shape: "linear" },
      opacity: year === lastYear ? 1 : 0.72,
      hovertemplate: `${periodLabel}<br>%{y:.1f} days ${comparison} %{x:.1f} °C<extra></extra>`,
      showlegend: false
    };
  });

  const layout = {
    margin: { l: 62, r: 22, t: 28, b: 60 },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { family: "DM Sans, sans-serif", color: "#607068", size: 12 },
    hovermode: "closest",
    xaxis: { title: options.xTitle, gridcolor: "#e4e3dc", zeroline: false, fixedrange: false },
    yaxis: { title: options.yTitle, range: [0, 372], gridcolor: "#e4e3dc", zeroline: false, fixedrange: false },
    annotations: [{
      xref: "paper", yref: "paper", x: 1, y: 0.015, xanchor: "right", yanchor: "bottom",
      text: `${place.latitude.toFixed(2)}°, ${place.longitude.toFixed(2)}°`, showarrow: false,
      font: { size: 10, color: "#7d8983" }
    }]
  };

  Plotly.react(elementId, traces, layout, { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["lasso2d", "select2d"] });
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

window.addEventListener("DOMContentLoaded", () => findLocation("Pamplona", true));
