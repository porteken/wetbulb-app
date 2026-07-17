# Historical Wetbulb App

A comprehensive web application hosted [here](https://wetbulb-app.vercel.app/) that visualizes wet-bulb temperature data for the top 500 largest cities in the Contiguous United States from 2000 to 2025. The data pipeline for getting the data is [here](https://github.com/porteken/pet-data).

## Features

- **Contiguous US City Map**: View wet-bulb temperature data across 500+ cities.
- **City Trend Charts**: Open a city modal from the map and view wet-bulb temperature trends.
- **Seasonal Analysis**: Switch between annual, spring, summer, fall, and winter views.
- **Measure Selection**: Switch between average and maximum wet-bulb temperature.
- **Forecasting**: Show 5–75 year forecasts for average and maximum wet-bulb temperature with confidence ranges.
- **Wetbulb Index Context**: See wetbulb index descriptions and legend details alongside trend data.
- **City Detail Pages**: Open a city page with trend and reference charts.
- **Reference Comparison**: Compare the current year's wet-bulb temperature with a selected historical year.
- **Rankings**: View cities ranked by wet-bulb temperature with year, season, state, and wetbulb index filters.
- **Theme Support**: Toggle between light and dark themes.

## What is Wetbulb?

**Wet-bulb temperature** is the lowest temperature air can reach through evaporative cooling alone. It combines the effects of heat and humidity into a single number, which makes it a strong proxy for heat stress: the human body cools itself primarily through the evaporation of sweat, and at high wet-bulb temperatures that cooling mechanism breaks down.

This app classifies wet-bulb temperature into the following risk levels:

| Level             | Range (°F) | Range (°C) |
| ----------------- | ---------- | ---------- |
| None              | < 68°F     | < 20°C     |
| Low Risk          | 68–76°F    | 20–24°C    |
| Moderate Risk     | 77–80°F    | 25–26°C    |
| High Risk         | 81–83°F    | 27–28°C    |
| Extreme Risk      | 84–87°F    | 29–30°C    |
| Empirical Limit   | 88–94°F    | 31–34°C    |
| Theoretical Limit | ≥ 95°F     | ≥ 35°C     |

- The 68–76°F (20–24°C) low-risk range is based on [this research](https://escholarship.org/content/qt2xz601d0/qt2xz601d0.pdf).
- The 77–94°F (25–34°C) moderate-through-extreme thresholds are based on [this exercise-safety guidance](https://www.princetonmedicine.com/blog/wet-bulb-temperature-and-exercise-safety-what-you-need-to-know).
- The ~88°F (31°C) empirical survivability limit, lower than the long-assumed 95°F (35°C) theoretical limit, is based on [this study](https://www.psu.edu/news/research/story/humans-cant-endure-temperatures-and-humidities-high-previously-thought).

## Tech Stack

- **Frontend**: Next.js, React
- **UI**: shadcn/ui
- **Map**: MapLibre, react-map-gl
- **Charts**: Recharts
- **Data**: Postgres, Kysely
- **Monitoring**: Sentry
- **Testing**: Vitest, Playwright, Test Containers
- **Deployment**: Vercel
