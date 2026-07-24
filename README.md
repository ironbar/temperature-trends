# Fifty Years of Heat

A minimal static site for exploring how daily maximum and minimum temperatures have changed across a user-selected year range. It uses Open-Meteo's geocoding and historical weather APIs and renders cumulative distributions for each year with Plotly.js.

## Run locally

No build step or package installation is needed.

```sh
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Push these files to a GitHub repository.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the branch (usually `main`) and the `/ (root)` folder, then save.

The site makes API requests in each visitor's browser, so no server or secret key is required. Open-Meteo's free API is intended for non-commercial use and is subject to usage limits.

## Data notes

- Daily maximum and minimum air temperature at 2 metres above the ground.
- The maximum plot counts days at or above each temperature; the minimum plot counts days at or below it.
- A client-side slider applies centred moving averages across 1–11 years. Choosing 1 disables averaging and never triggers another data download.
- ERA5-Land is used consistently across the full period.
- The default range is the latest 50 complete calendar years; users can select any complete years from 1950 onward.
- ERA5-Land represents an approximately 11 km grid cell rather than a specific weather station.
