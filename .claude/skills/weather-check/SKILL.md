---
name: weather-check
argument-hint: <city name> [--units imperial] [--json]
description: >-
  Fetch the current weather for any city by name — temperature, feels-like,
  condition, humidity, wind, and precipitation — using the free, no-API-key
  Open-Meteo service. Use this skill whenever the user asks about current
  weather, temperature, or conditions for a place ("what's the weather in
  Tokyo", "is it raining in Seattle", "how hot is it in Dubai right now",
  "weather for Da Nang"), even if they don't say the word "weather" explicitly.
  Trigger on any request to look up live outdoor conditions for a named city,
  town, or region.
---

# Weather Check

Look up the **current** weather for a city and report it in a readable,
detailed form. Backed by [Open-Meteo](https://open-meteo.com), which is free
and needs no API key, so this works out of the box.

## How to use it

Run the bundled script with the city name. It geocodes the name to coordinates
and fetches current conditions in one call, then prints a formatted report.

```bash
python3 scripts/weather.py "San Francisco"
```

Paths are relative to this skill's directory — run from here, or pass the full
path to `scripts/weather.py`.

### Options

- **Units.** Default is metric (°C, km/h, mm). Pass `--units imperial` for
  °F / mph / inch. Choose based on the user: imperial for US cities or if they
  mention Fahrenheit, metric otherwise. If unsure, match the country.
- **Disambiguation.** Geocoding takes the top match. If a name is ambiguous
  (e.g. "Springfield", "Portland"), add a country or region to the query:
  `"Portland, Oregon"` or `"Portland, Maine"`.
- **Raw data.** Pass `--json` to also print the structured location + weather
  data, useful if the user wants to compute something from the numbers.

### Examples

```bash
python3 scripts/weather.py "Da Nang, Vietnam"
python3 scripts/weather.py --units imperial "Austin"
python3 scripts/weather.py --json "Tokyo"
```

## Reporting back to the user

Run the script and relay its output. Keep the detail it provides (condition,
temperature + feels-like, humidity, wind, precipitation) — that detail is the
point. You can lead with a one-line natural-language summary if it helps
("It's overcast and 33°C in Da Nang right now"), then show the report.

If the user asks about **several cities**, run the script once per city.

If the skill is invoked **without a city** (e.g. a bare `/weather-check`), don't
guess a city — run the script with no arguments to print its usage/help, and
ask the user which city they want.

## When things go wrong

The script exits non-zero and prints to stderr in two cases — read the message
and pass the gist to the user rather than retrying blindly:

- **City not found** (exit 1): the name didn't geocode. Suggest adding a country
  or region, or check spelling. Don't guess coordinates.
- **Network/service error** (exit 2): Open-Meteo was unreachable. Mention it may
  be a transient network issue; a retry is reasonable.

## Notes

- This reports **current** conditions only, not multi-day forecasts. If the user
  wants a forecast, say so — extending the script to call Open-Meteo's
  `daily=` / `hourly=` parameters would be the way to add it.
- The script depends only on the Python standard library (plus `certifi` if
  present, to satisfy SSL on macOS). No `pip install` needed.
