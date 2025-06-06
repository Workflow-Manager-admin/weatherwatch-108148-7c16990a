import React, { useState, useEffect, useCallback } from "react";

// PUBLIC_INTERFACE
/**
 * WeatherWatch main container for current weather, forecast, search, geolocation.
 * Applies weather-adaptive background and the specified dark theme.
 */
const WEATHER_API_KEY = "demo"; // TODO: Replace 'demo' with your OpenWeatherMap API key
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

// PUBLIC_INTERFACE
function WeatherWatch() {
  const [city, setCity] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [geoError, setGeoError] = useState(null);
  const [apiError, setApiError] = useState(null);

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
    return (
      <div style={{
        background: COLORS.darkCard,
        color: COLORS.white,
        padding: "2.2rem 2rem",
        borderRadius: "1.5rem",
        minWidth: 270,
        minHeight: 200,
        boxShadow: "0 6px 24px rgba(0,0,0,0.25)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        marginBottom: "1.5rem"
      }}>
        <span style={{ color: COLORS.accent, fontSize: "1.05rem", fontWeight: 500 }}>{city}</span>
        <img src={iconURL} alt={w.description} style={{ width: 80, height: 80, margin: "0.5rem 0" }} />
        <span style={{ fontSize: "3.6rem", fontWeight: 700 }}>
          {Math.round(weather.main.temp)}&deg;C
        </span>
        <span style={{ fontSize: "1.2rem", color: COLORS.secondary, marginBottom: 6 }}>
          {w.main} <span style={{ fontStyle: "italic" }}>({w.description})</span>
        </span>
        <div style={{ display: "flex", gap: 24, marginTop: "0.55rem", color: COLORS.secondary, fontSize: "0.95rem" }}>
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
          return (
            <div key={i}
                 style={{
                   background: "#23273a",
                   color: COLORS.white,
                   minWidth: 110,
                   borderRadius: "1rem",
                   padding: "1.1rem 0.7rem 1.3rem 0.7rem",
                   display: "flex",
                   flexDirection: "column",
                   alignItems: "center",
                   boxShadow: "0 4px 14px rgba(0,0,0,0.10)",
                   border: `1.5px solid ${COLORS.primary}15` // translucent primary border
                 }}>
              <span style={{ fontSize: "1.08rem", fontWeight: 600, color: COLORS.accent }}>{day}</span>
              <img src={iconURL} alt={w.description} style={{ width: 48, height: 48, margin: "0.45rem 0" }} />
              <span style={{ fontSize: "1.15rem", fontWeight: 700 }}>
                {Math.round(f.main.temp_min)}&deg;/<b>{Math.round(f.main.temp_max)}&deg;C</b>
              </span>
              <span style={{ fontSize: "0.98rem", color: COLORS.secondary }}>{w.main}</span>
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
        background: bgGradient,
        transition: "background 0.8s cubic-bezier(0.3,0.7,0.7,1)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: 0
      }}
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
          background: "rgba(18, 19, 22, 0.90)",
          borderRadius: "1.7rem",
          boxShadow: "0 12px 40px rgba(20,40,70,0.13)",
          padding: "2rem 1rem 1.5rem 1rem",
          minHeight: "76vh",
        }}
      >
        <h2
          style={{
            fontWeight: 900,
            fontSize: "2.1rem",
            margin: 0,
            paddingBottom: 8,
            letterSpacing: "0.02em",
            color: COLORS.primary,
            textAlign: "center",
            textShadow: "0 3px 22px #1976d2a0"
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
              border: "2px solid " + COLORS.primary,
              background: COLORS.darkBg,
              color: COLORS.white,
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
              background: COLORS.accent,
              color: COLORS.darkCard,
              fontWeight: 700,
              fontSize: "1.07rem",
              cursor: "pointer",
              transition: "background 0.18s"
            }}>
            Search
          </button>
        </form>
        {geoError && (
          <div style={{ color: COLORS.accent, fontWeight: 500, marginBottom: 16 }}>{geoError}</div>
        )}
        {apiError && (
          <div style={{
            color: "#f36",
            background: "#260b13",
            padding: "0.65rem 1rem",
            borderRadius: "0.9rem",
            marginBottom: "1rem",
            fontWeight: 500
          }}>{apiError}</div>
        )}
        {loading ? (
          <div style={{ color: COLORS.secondary, fontSize: "1.5rem", marginTop: 36 }}>
            Loading weather...
          </div>
        ) : (
          <>
            <CurrentWeatherCard />
            <div style={{
              width: "100%",
              borderBottom: `1.5px solid ${COLORS.primary}15`,
              margin: "0 0 1.1rem 0"
            }}/>
            <div style={{ width: "100%", marginBottom: "0.5rem" }}>
              <span
                style={{
                  color: COLORS.accent,
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
            color: COLORS.secondary,
            opacity: 0.88
          }}
        >
          <span>
            Powered by <a href="https://openweathermap.org/" style={{ color: COLORS.primary }}>OpenWeatherMap</a>
          </span>
        </footer>
      </div>
    </div>
  );
}

export default WeatherWatch;
