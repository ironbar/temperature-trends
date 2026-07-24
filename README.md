# Fifty Years of Heat

A minimal static site for exploring how daily maximum temperatures have changed over the latest 50 complete years. It uses Open-Meteo's geocoding and historical weather APIs and renders a cumulative distribution for each year with Plotly.js.

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

- Daily maximum air temperature at 2 m.
- ERA5-Land is used consistently across the full period.
- The latest 50 complete calendar years are shown; the current partial year is excluded.
- ERA5-Land represents an approximately 11 km grid cell rather than a specific weather station.
