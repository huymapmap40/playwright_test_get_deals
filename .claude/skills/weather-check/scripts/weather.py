#!/usr/bin/env python3
"""Fetch current weather for a city using the free, key-less Open-Meteo API.

Two steps under the hood:
  1. Geocode the city name -> latitude/longitude (Open-Meteo geocoding API)
  2. Fetch current conditions for those coordinates (Open-Meteo forecast API)

Prints a human-readable detailed report. Use --json to also emit the raw
structured data (handy when a caller wants to reuse the numbers).

Usage:
  python3 scripts/weather.py "San Francisco"
  python3 scripts/weather.py "Da Nang, Vietnam"
  python3 scripts/weather.py --units imperial "Austin"
  python3 scripts/weather.py --json "Tokyo"
"""

import argparse
import json
import ssl
import sys
import urllib.parse
import urllib.request

GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
FORECAST_URL = "https://api.open-meteo.com/v1/forecast"


def _ssl_context():
    """Build an SSL context that can find a CA bundle.

    Python on macOS often ships without access to the system trust store, which
    makes HTTPS calls fail with CERTIFICATE_VERIFY_FAILED. If the `certifi`
    package is installed, use its bundle; otherwise fall back to the default.
    """
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except Exception:
        return ssl.create_default_context()

# WMO weather interpretation codes -> (description, emoji)
# https://open-meteo.com/en/docs  (see "Weather variable documentation")
WMO_CODES = {
    0: ("Clear sky", "☀️"),
    1: ("Mainly clear", "🌤️"),
    2: ("Partly cloudy", "⛅"),
    3: ("Overcast", "☁️"),
    45: ("Fog", "🌫️"),
    48: ("Depositing rime fog", "🌫️"),
    51: ("Light drizzle", "🌦️"),
    53: ("Moderate drizzle", "🌦️"),
    55: ("Dense drizzle", "🌦️"),
    56: ("Light freezing drizzle", "🌧️"),
    57: ("Dense freezing drizzle", "🌧️"),
    61: ("Slight rain", "🌧️"),
    63: ("Moderate rain", "🌧️"),
    65: ("Heavy rain", "🌧️"),
    66: ("Light freezing rain", "🌧️"),
    67: ("Heavy freezing rain", "🌧️"),
    71: ("Slight snowfall", "🌨️"),
    73: ("Moderate snowfall", "🌨️"),
    75: ("Heavy snowfall", "❄️"),
    77: ("Snow grains", "🌨️"),
    80: ("Slight rain showers", "🌦️"),
    81: ("Moderate rain showers", "🌧️"),
    82: ("Violent rain showers", "⛈️"),
    85: ("Slight snow showers", "🌨️"),
    86: ("Heavy snow showers", "❄️"),
    95: ("Thunderstorm", "⛈️"),
    96: ("Thunderstorm with slight hail", "⛈️"),
    99: ("Thunderstorm with heavy hail", "⛈️"),
}

COMPASS = [
    "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
]


def _get_json(url, params):
    query = urllib.parse.urlencode(params)
    full = f"{url}?{query}"
    req = urllib.request.Request(full, headers={"User-Agent": "weather-check-skill/1.0"})
    with urllib.request.urlopen(req, timeout=15, context=_ssl_context()) as resp:
        return json.loads(resp.read().decode("utf-8"))


def geocode(city):
    data = _get_json(GEOCODE_URL, {"name": city, "count": 1, "language": "en", "format": "json"})
    results = data.get("results")
    if not results:
        return None
    r = results[0]
    return {
        "name": r.get("name"),
        "country": r.get("country"),
        "admin1": r.get("admin1"),  # state/region, may be absent
        "latitude": r["latitude"],
        "longitude": r["longitude"],
        "timezone": r.get("timezone"),
    }


def fetch_current(lat, lon, units, timezone):
    temp_unit = "fahrenheit" if units == "imperial" else "celsius"
    wind_unit = "mph" if units == "imperial" else "kmh"
    precip_unit = "inch" if units == "imperial" else "mm"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": ",".join([
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "is_day",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
        ]),
        "temperature_unit": temp_unit,
        "wind_speed_unit": wind_unit,
        "precipitation_unit": precip_unit,
        "timezone": timezone or "auto",
    }
    return _get_json(FORECAST_URL, params)


def deg_to_compass(deg):
    if deg is None:
        return "?"
    idx = int((deg / 22.5) + 0.5) % 16
    return COMPASS[idx]


def build_report(place, weather, units):
    # Open-Meteo returns these on any successful (200) forecast call. If they're
    # absent the response shape is unexpected, so fail loudly with a clear
    # message rather than letting a bare KeyError surface as a stack trace.
    cur = weather.get("current")
    u = weather.get("current_units")
    if not cur or not u:
        raise ValueError("weather service returned an unexpected response (no current conditions)")
    code = cur.get("weather_code")
    desc, emoji = WMO_CODES.get(code, ("Unknown", "❓"))

    loc_parts = [place["name"]]
    if place.get("admin1") and place["admin1"] != place["name"]:
        loc_parts.append(place["admin1"])
    if place.get("country"):
        loc_parts.append(place["country"])
    location = ", ".join(loc_parts)

    temp_u = u.get("temperature_2m", "°")
    wind_u = u.get("wind_speed_10m", "")
    precip_u = u.get("precipitation", "")
    humidity_u = u.get("relative_humidity_2m", "%")

    wind = cur.get("wind_speed_10m")
    wind_dir = deg_to_compass(cur.get("wind_direction_10m"))
    wind_u = wind_u.replace("mp/h", "mph")  # Open-Meteo labels imperial wind "mp/h"
    daynight = "Day" if cur.get("is_day") == 1 else "Night"

    def row(label, value):
        return f"   {label + ':':<15}{value}"

    lines = [
        f"{emoji}  Current weather — {location}",
        row("Condition", f"{desc} ({daynight})"),
        row("Temperature", f"{cur.get('temperature_2m')}{temp_u}  (feels like {cur.get('apparent_temperature')}{temp_u})"),
        row("Humidity", f"{cur.get('relative_humidity_2m')}{humidity_u}"),
        row("Wind", f"{wind} {wind_u} from {wind_dir}"),
        row("Precipitation", f"{cur.get('precipitation')} {precip_u}"),
        row("Observed", f"{cur.get('time')} ({weather.get('timezone', 'local')})"),
    ]
    return "\n".join(lines)


HELP = """\
weather-check — current weather for any city (Open-Meteo, no API key)

Usage:
  python3 scripts/weather.py "CITY"           current weather, metric units
  python3 scripts/weather.py --units imperial "CITY"   °F / mph / inch
  python3 scripts/weather.py --json "CITY"     also print raw structured data

Tips:
  • Add a country or region to disambiguate: "Portland, Oregon".
  • Reports current conditions only (not a multi-day forecast).

Examples:
  python3 scripts/weather.py "Ho Chi Minh City"
  python3 scripts/weather.py --units imperial "Austin"
"""


def main():
    parser = argparse.ArgumentParser(
        description="Current weather for a city (Open-Meteo, no API key).",
        add_help=True,
    )
    parser.add_argument("city", nargs="*", help="City name, e.g. 'San Francisco' or 'Da Nang, Vietnam'")
    parser.add_argument("--units", choices=["metric", "imperial"], default="metric",
                        help="metric = °C/km/h/mm (default); imperial = °F/mph/inch")
    parser.add_argument("--json", action="store_true", dest="as_json",
                        help="Also print the raw structured data as JSON")
    args = parser.parse_args()

    if not args.city:
        # No city given: show friendly guidance instead of a terse error so the
        # user (or Claude) immediately knows what to type next.
        print(HELP)
        return 0

    city = " ".join(args.city)

    try:
        place = geocode(city)
    except Exception as e:  # network / parse errors
        print(f"Error reaching the geocoding service: {e}", file=sys.stderr)
        return 2

    if place is None:
        print(f"Could not find a city named '{city}'. Try adding a country, e.g. '{city}, US'.",
              file=sys.stderr)
        return 1

    try:
        weather = fetch_current(place["latitude"], place["longitude"], args.units, place.get("timezone"))
        report = build_report(place, weather, args.units)
    except Exception as e:
        print(f"Error reaching the weather service: {e}", file=sys.stderr)
        return 2

    print(report)

    if args.as_json:
        print("\n--- raw ---")
        print(json.dumps({"location": place, "weather": weather}, indent=2, ensure_ascii=False))

    return 0


if __name__ == "__main__":
    sys.exit(main())
