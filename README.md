# Temperature trends

A minimal static site for exploring how daily maximum and minimum temperatures have changed across a user-selected year range. It uses Open-Meteo's geocoding and historical weather APIs and renders one Plotly.js line per year—or per centred multi-year average. Pamplona, Navarre, Spain is the default location, and users can search for any other place.

The interface separates two kinds of controls:

- **Get temperature data:** choose a location and the year interval downloaded from Open-Meteo.
- **Change the visualisation:** filter the already-loaded years and adjust averaging without making another API request.

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
- The maximum-temperature curve counts days at or above each temperature and therefore descends from left to right.
- The minimum-temperature curve counts days at or below each temperature and therefore rises from left to right.
- A client-side slider applies centred moving averages across 1–11 years. A 3-year line averages the previous, labelled and following years, so the endpoint years are omitted. Choosing 1 disables averaging.
- The data-range slider controls which years are downloaded from Open-Meteo.
- The display-range slider filters those loaded years locally without making another API request.
- ERA5-Land is used consistently across the full period.
- The default range is the latest 50 complete calendar years; users can select any complete years from 1950 onward.
- ERA5-Land represents an approximately 11 km grid cell rather than a specific weather station.
