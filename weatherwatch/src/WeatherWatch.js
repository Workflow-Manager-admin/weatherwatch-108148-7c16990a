import React, { useState, useEffect, useCallback } from "react";

/**
 * Utility for temperature conversions
 * C = Celsius, F = Fahrenheit, K = Kelvin
 */
// PUBLIC_INTERFACE
function toF(c) {
  return Math.round((c * 9) / 5 + 32);
}
function toC(f) {
  return Math.round(((f - 32) * 5) / 9);
}
// PUBLIC_INTERFACE
function toK(tempC) {
  return Math.round(tempC + 273.15);
}
// PUBLIC_INTERFACE
function fromK(k) {
  return Math.round(k - 273.15);
}
// PUBLIC_INTERFACE
/**
 * WeatherWatch main container for current weather, forecast, search, geolocation.
 * Applies weather-adaptive background and the specified dark theme.
 */
const WEATHER_API_KEY = "6f9e273225293ea2d4479a00d0d2c7ac"; // Updated with user-supplied OpenWeatherMap API key
const WEATHER_API_BASE = "https://api.openweathermap.org/data/2.5";
const WEATHER_ICON_URL = "https://openweathermap.org/img/wn/";

const COLORS = {
  primary: "#2196F3",
  secondary: "#90CAF9",
  accent: "#FFC107",
  darkBg: "#181A1B",
  darkCard: "#24283B",
  white: "#fff",
};

// Dark theme, weather-adaptive backgrounds
const GRADIENTS = {
  Clear: `linear-gradient(135deg, ${COLORS.primary} 40%, #4FC3F7 100%)`,
  Clouds: `linear-gradient(135deg, #616161 40%, #757575 100%)`,
  Rain: `linear-gradient(135deg, #01579B 30%, #90CAF9 100%)`,
  Thunderstorm: `linear-gradient(135deg, #0D1332 40%, #3A3D5C 100%)`,
  Drizzle: `linear-gradient(135deg, #1976D2 40%, #64B5F6 100%)`,
  Snow: `linear-gradient(135deg, #B3E5FC 55%, #ECEFF1 100%)`,
  Mist: `linear-gradient(135deg, #607D8B 40%, #CFD8DC 100%)`,
  Haze: `linear-gradient(135deg, #8997a6 40%, #cfd8dc 90%)`,
  Default: `linear-gradient(135deg, #222 40%, #444 100%)`,
};

function getWeatherGradient(main) {
  return GRADIENTS[main] || GRADIENTS["Default"];
}

/**
 * WeatherWatch main container for current weather, forecast, search, geolocation.
 * Applies weather-adaptive background and the specified dark theme.
 */
function WeatherWatch() {
  const [city, setCity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [apiError, setApiError] = useState(null);

  // ADDED: Theme and temperature toggles
  const [theme, setTheme] = useState("dark"); // "dark" | "light"
  // "C" = Celsius, "F" = Fahrenheit, "K" = Kelvin
  const [tempUnit, setTempUnit] = useState("C");

  // PUBLIC_INTERFACE
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));
  // Cycles through C -> F -> K -> C ...
  // PUBLIC_INTERFACE
  const toggleTempUnit = () =>
    setTempUnit((u) => (u === "C" ? "F" : u === "F" ? "K" : "C"));

  // Theme-aware COLORS and GRADIENTS definitions
  const THEME_COLORS = {
    dark: {
      primary: "#2196F3",
      secondary: "#90CAF9",
      accent: "#FFC107",
      bg: "#181A1B",
      card: "#23273a",
      cardAlt: "#24283B",
      text: "#fff",
      textSecondary: "rgba(255,255,255,0.7)",
      border: "#4177a780",
      inputBg: "#23273a",
      btn: "#FFC107",
      btnFg: "#21243A",
      link: "#2196F3"
    },
    light: {
      primary: "#156bc4", // deep blue, harmonious w/ accent
      secondary: "#8bb8ea",
      accent: "#FF9800",
      bg: "#eaf1fb",
      card: "#ffffff",
      cardAlt: "#f5f7fa",
      text: "#23273a",
      textSecondary: "#4177a7d5",
      border: "#1976d22d",
      inputBg: "#f6f8fa",
      btn: "#FF9800",
      btnFg: "#185fa1",
      link: "#156bc4"
    },
  };

  // Dynamic card and background colors
  const themeColors = THEME_COLORS[theme];

  // Weather adaptive BG gradients for both themes
  const THEME_GRADIENTS = {
    dark: {
      Clear: `linear-gradient(135deg, #2196f3 40%, #4FC3F7 100%)`,
      Clouds: `linear-gradient(135deg, #616161 40%, #757575 100%)`,
      Rain: `linear-gradient(135deg, #01579B 30%, #90CAF9 100%)`,
      Thunderstorm: `linear-gradient(135deg, #0D1332 40%, #3A3D5C 100%)`,
      Drizzle: `linear-gradient(135deg, #1976D2 40%, #64B5F6 100%)`,
      Snow: `linear-gradient(135deg, #B3E5FC 55%, #ECEFF1 100%)`,
      Mist: `linear-gradient(135deg, #607D8B 40%, #CFD8DC 100%)`,
      Haze: `linear-gradient(135deg, #8997a6 40%, #cfd8dc 90%)`,
      Default: `linear-gradient(135deg, #222 40%, #444 100%)`,
    },
    light: {
      Clear: `linear-gradient(135deg, #eaf1fb 25%, #b5e3fa 88%, #fdecba 99%)`,
      Clouds: `linear-gradient(135deg, #cacfd2 35%, #e9e9e9 100%)`,
      Rain: `linear-gradient(135deg, #b6cfff 30%, #f2fafe 100%)`,
      Thunderstorm: `linear-gradient(135deg, #a2a8d6 40%, #f9fafc 100%)`,
      Drizzle: `linear-gradient(135deg, #8ee0ff 20%, #ddefff 100%)`,
      Snow: `linear-gradient(135deg, #fafdff 60%, #e3f4fb 100%)`,
      Mist: `linear-gradient(135deg, #e3efee 40%, #f7fafd 100%)`,
      Haze: `linear-gradient(135deg, #e2ece6 40%, #fec 100%)`,
      Default: `linear-gradient(135deg, #eaf1fb 40%, #e6e6e6 100%)`,
    }
  };

  function getWeatherGradient(main) {
    return THEME_GRADIENTS[theme][main] || THEME_GRADIENTS[theme]["Default"];
  }

  // Helper: fetch weather and forecast for city or coords
  const fetchWeather = useCallback(async (params) => {
    setLoading(true);
    setApiError(null);

    try {
      // Current weather
      let url = `${WEATHER_API_BASE}/weather?appid=${WEATHER_API_KEY}&units=metric`;
      if (params.city) {
        url += `&q=${encodeURIComponent(params.city)}`;
      } else if (params.lat && params.lon) {
        url += `&lat=${params.lat}&lon=${params.lon}`;
      }

      const weatherRes = await fetch(url);
      if (!weatherRes.ok) {
        throw new Error("City not found");
      }
      const weatherData = await weatherRes.json();

      // 5-day forecast
      let url2 = `${WEATHER_API_BASE}/forecast?appid=${WEATHER_API_KEY}&units=metric`;
      if (params.city) {
        url2 += `&q=${encodeURIComponent(params.city)}`;
      } else if (params.lat && params.lon) {
        url2 += `&lat=${params.lat}&lon=${params.lon}`;
      }

      const forecastRes = await fetch(url2);
      if (!forecastRes.ok) {
        throw new Error("Forecast unavailable.");
      }
      const forecastData = await forecastRes.json();

      // 5-day forecast summary: one item per day
      const dailyMap = {};
      for (const f of forecastData.list) {
        const date = f.dt_txt.split(" ")[0];
        if (!dailyMap[date] || f.dt_txt.includes("12:00:00")) {
          dailyMap[date] = f;
        }
      }
      const dailyArr = Object.values(dailyMap).slice(0, 5);

      setWeather(weatherData);
      setForecast(dailyArr);
      setCity(weatherData.name);
      setLoading(false);
    } catch (err) {
      setApiError(err.message || "Unable to fetch weather.");
      setLoading(false);
    }
  }, []);

  // Try geolocation on mount
  useEffect(() => {
    if (!window.navigator.geolocation) {
      setGeoError("Geolocation not supported");
      setLoading(false);
      return;
    }
    window.navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeather({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      (err) => {
        setGeoError("Unable to get location. Search for a city instead.");
        setLoading(false);
      }
    );
  }, [fetchWeather]);

  // Handle search bar submit
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim() !== "") {
      fetchWeather({ city: searchTerm.trim() });
    }
  };

  // Background
  let bgGradient = GRADIENTS.Default;
  if (weather && weather.weather && weather.weather[0]) {
    bgGradient = getWeatherGradient(weather.weather[0].main);
  }

  // Weather main card
  function CurrentWeatherCard() {
    if (!weather) return null;
    const w = weather.weather[0];
    const iconURL = `${WEATHER_ICON_URL}${w.icon}@4x.png`;

    // Temperature display logic
    let showTemp, unitLabel;
    if (tempUnit === "C") {
      showTemp = Math.round(weather.main.temp);
      unitLabel = "°C";
    } else if (tempUnit === "F") {
      showTemp = toF(weather.main.temp);
      unitLabel = "°F";
    } else if (tempUnit === "K") {
      showTemp = toK(weather.main.temp);
      unitLabel = "K";
    }

    return (
      <div style={{
        background: themeColors.cardAlt,
        color: themeColors.text,
        padding: "2.2rem 2rem",
        borderRadius: "1.5rem",
        minWidth: 270,
        minHeight: 200,
        boxShadow: theme === "dark"
          ? "0 6px 24px rgba(0,0,0,0.25)"
          : "0 4px 18px #bfd5ed50",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <span style={{ color: themeColors.accent, fontSize: "1.05rem", fontWeight: 500 }}>{city}</span>
        <img src={iconURL} alt={w.description} style={{ width: 80, height: 80, margin: "0.5rem 0" }} />
        <span style={{ fontSize: "3.6rem", fontWeight: 700 }}>
          {showTemp}{unitLabel}
        </span>
        <span style={{ fontSize: "1.2rem", color: themeColors.secondary, marginBottom: 6 }}>
          {w.main} <span style={{ fontStyle: "italic" }}>({w.description})</span>
        </span>
        <div style={{ display: "flex", gap: 24, marginTop: "0.55rem", color: themeColors.secondary, fontSize: "0.95rem" }}>
          <div title="Humidity">
            <span role="img" aria-label="humidity">💧</span>
            {" "}{weather.main.humidity}% Humidity
          </div>
          <div title="Wind">
            <span role="img" aria-label="wind">💨</span>
            {" "}{Math.round(weather.wind.speed)} km/h Wind
          </div>
        </div>
      </div>
    );
  }

  // 5-Day forecast view
  function ForecastCards() {
    if (!forecast.length) return null;
    return (
      <div style={{
        display: "flex",
        overflowX: "auto",
        gap: "1rem",
        paddingBottom: 12,
        margin: "0 -8px"
      }}>
        {forecast.map((f, i) => {
          const w = f.weather[0];
          const day = (new Date(f.dt_txt)).toLocaleDateString(undefined, {
            weekday: "short"
          });
          const iconURL = `${WEATHER_ICON_URL}${w.icon}@2x.png`;
          // Min/max temps (always in C from API)
          let tMin, tMax, unitLabel;
          if (tempUnit === "C") {
            tMin = Math.round(f.main.temp_min);
            tMax = Math.round(f.main.temp_max);
            unitLabel = "°C";
          } else if (tempUnit === "F") {
            tMin = toF(f.main.temp_min);
            tMax = toF(f.main.temp_max);
            unitLabel = "°F";
          } else if (tempUnit === "K") {
            tMin = toK(f.main.temp_min);
            tMax = toK(f.main.temp_max);
            unitLabel = "K";
          }
          return (
            <div key={i}
                 style={{
                   background: themeColors.card,
                   color: themeColors.text,
                   minWidth: 110,
                   borderRadius: "1rem",
                   padding: "1.1rem 0.7rem 1.3rem 0.7rem",
                   display: "flex",
                   flexDirection: "column",
                   alignItems: "center",
                   boxShadow: theme === "dark"
                      ? "0 4px 14px rgba(0,0,0,0.10)"
                      : "0 2px 8px #bfd5ed55",
                   border: `1.5px solid ${
                     themeColors.primary
                   }25`
                 }}>
              <span style={{ fontSize: "1.08rem", fontWeight: 600, color: themeColors.accent }}>{day}</span>
              <img src={iconURL} alt={w.description} style={{ width: 48, height: 48, margin: "0.45rem 0" }} />
              <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                {tMin}
                {tempUnit === "K" ? "" : <>&deg;</>}
                /
                <b>
                  {tMax}
                  {tempUnit === "K" ? "" : <>&deg;</>}
                  {unitLabel}
                </b>
              </span>
              <span style={{ fontSize: "0.98rem", color: themeColors.secondary }}>{w.main}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100vw",
        background: (weather && weather.weather && weather.weather[0])
          ? getWeatherGradient(weather.weather[0].main)
          : getWeatherGradient("Default"),
        transition: "background 0.8s cubic-bezier(0.3,0.7,0.7,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 0
      }}
      className={theme === "dark" ? "theme-dark" : "theme-light"}
    >
      {/* Card-centered layout, responsive */}
      <div
        style={{
          width: "100%",
          maxWidth: 428,
          margin: "64px auto 0 auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          background: themeColors.bg,
          borderRadius: "1.7rem",
          boxShadow: theme === "dark"
            ? "0 12px 40px rgba(20,40,70,0.13)"
            : "0 10px 24px #bfd5ed70",
          padding: "2rem 1rem 1.5rem 1rem",
          minHeight: "76vh",
        }}
      >
        {/* Toggles row */}
        <div style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem"
        }}>
          <button
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            onClick={toggleTheme}
            style={{
              background: themeColors.card,
              color: themeColors.primary,
              border: `1.5px solid ${themeColors.primary}35`,
              borderRadius: "2em",
              padding: "0.55em 1.25em",
              fontWeight: 700,
              fontSize: "1.05rem",
              cursor: "pointer",
              outline: "none",
              boxShadow:
                theme === "dark"
                  ? "0 2px 8px #191a2a40"
                  : "0 2px 6px #bfd5ed40",
              transition: "all 0.22s"
            }}
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45em",
            marginLeft: "1.2em"
          }}>
            {["C", "F", "K"].map(unit => (
              <button
                key={unit}
                aria-label={`Show temperatures in ${unit === "C" ? "Celsius" : unit === "F" ? "Fahrenheit" : "Kelvin"}`}
                onClick={() => setTempUnit(unit)}
                style={{
                  background: tempUnit === unit ? themeColors.cardAlt : themeColors.card,
                  color:
                    tempUnit === unit
                      ? (unit === "K" ? "#29b6f6" :
                          unit === "F" ? themeColors.accent : themeColors.primary)
                      : (unit === "F" ? themeColors.accent : unit === "K" ? "#29b6f6" : themeColors.primary),
                  border: `1.5px solid ${
                    unit === "C"
                      ? themeColors.primary + (tempUnit === unit ? "95" : "35")
                      : unit === "F"
                      ? themeColors.accent + (tempUnit === unit ? "95" : "40")
                      : "#29b6f6" + (tempUnit === unit ? "a5" : "45")
                  }`,
                  borderRadius: "2em",
                  padding: "0.55em 1.15em",
                  fontWeight: tempUnit === unit ? 800 : 700,
                  fontSize: "1.05rem",
                  cursor: tempUnit === unit ? "default" : "pointer",
                  outline: "none",
                  boxShadow:
                    tempUnit === unit
                      ? (unit === "F"
                          ? "0 2px 10px #ffd1a099"
                          : unit === "C"
                          ? "0 2px 10px #1b6cff44"
                          : "0 2px 10px #29b6f688")
                      : (theme === "dark"
                        ? "0 2px 8px #191a2a30"
                        : "0 2px 6px #ffd1a0aa"),
                  transition: "all 0.22s"
                }}
                disabled={tempUnit === unit}
              >
                {unit === "C" ? "°C" : unit === "F" ? "°F" : "K"}
              </button>
            ))}
          </div>
        </div>

        <h2
          style={{
            fontWeight: 900,
            fontSize: "2.1rem",
            margin: 0,
            paddingBottom: 8,
            letterSpacing: "0.02em",
            color: themeColors.primary,
            textAlign: "center",
            textShadow:
              theme === "dark"
                ? "0 3px 22px #1976d2a0"
                : "0 2px 10px #91bbeb30"
          }}>
          WeatherWatch
        </h2>
        <form
          onSubmit={handleSearch}
          style={{
            width: "100%",
            display: "flex",
            margin: "0.5rem 0 2rem 0",
            gap: "0.7rem"
          }}>
          <input
            type="text"
            placeholder="Enter city (e.g. London)"
            aria-label="Search City"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: "0.85rem 1rem",
              borderRadius: "1.1rem",
              border: `2px solid ${themeColors.primary}`,
              background: themeColors.inputBg,
              color: themeColors.text,
              fontSize: "1.07rem",
              outline: "none"
            }}
          />
          <button
            type="submit"
            style={{
              borderRadius: "1.1rem",
              border: "none",
              padding: "0.89rem 1.2rem",
              background: themeColors.btn,
              color: themeColors.btnFg,
              fontWeight: 700,
              fontSize: "1.07rem",
              cursor: "pointer",
              transition: "background 0.18s"
            }}>
            Search
          </button>
        </form>
        {geoError && (
          <div style={{ color: themeColors.accent, fontWeight: 500, marginBottom: 16 }}>{geoError}</div>
        )}
        {apiError && (
          <div style={{
            color: theme === "dark" ? "#f36" : "#a40c0c",
            background: theme === "dark" ? "#260b13" : "#fadad2",
            padding: "0.65rem 1rem",
            borderRadius: "0.9rem",
            marginBottom: "1rem",
            fontWeight: 500
          }}>{apiError}</div>
        )}
        {loading ? (
          <div style={{ color: themeColors.secondary, fontSize: "1.5rem", marginTop: 36 }}>
            Loading weather...
          </div>
        ) : (
          <>
            <CurrentWeatherCard />
            <div style={{
              width: "100%",
              borderBottom: `1.5px solid ${themeColors.primary}15`,
              margin: "0 0 1.1rem 0"
            }}/>
            <div style={{ width: "100%", marginBottom: "0.5rem" }}>
              <span
                style={{
                  color: themeColors.accent,
                  fontWeight: 700,
                  fontSize: "1.15rem",
                  letterSpacing: "0.01em",
                  marginBottom: "2rem"
                }}>
                5-Day Forecast
              </span>
              <ForecastCards />
            </div>
          </>
        )}
        <footer
          style={{
            width: "100%",
            marginTop: "auto",
            paddingTop: 14,
            fontSize: "0.97rem",
            textAlign: "center",
            color: themeColors.secondary,
            opacity: 0.88
          }}
        >
          <span>
            Powered by{" "}
            <a
              href="https://openweathermap.org/"
              style={{
                color: themeColors.link,
                textDecoration: "underline",
                fontWeight: 600,
                textShadow: theme === "dark" ? undefined : "0 1px 10px #f5f5ff60"
              }}
            >
              OpenWeatherMap
            </a>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default WeatherWatch;
