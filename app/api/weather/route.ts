import { NextResponse } from "next/server";

const LAT = process.env.WEATHER_LAT ?? "40.7128";
const LON = process.env.WEATHER_LON ?? "-74.0060";

const WMO_CODES: Record<number, { condition: string; icon: string }> = {
  0: { condition: "Clear Sky", icon: "☀️" },
  1: { condition: "Mainly Clear", icon: "🌤️" },
  2: { condition: "Partly Cloudy", icon: "⛅" },
  3: { condition: "Overcast", icon: "☁️" },
  45: { condition: "Foggy", icon: "🌫️" },
  48: { condition: "Icy Fog", icon: "🌫️" },
  51: { condition: "Light Drizzle", icon: "🌦️" },
  61: { condition: "Light Rain", icon: "🌧️" },
  63: { condition: "Moderate Rain", icon: "🌧️" },
  65: { condition: "Heavy Rain", icon: "🌧️" },
  71: { condition: "Light Snow", icon: "🌨️" },
  73: { condition: "Moderate Snow", icon: "❄️" },
  75: { condition: "Heavy Snow", icon: "❄️" },
  80: { condition: "Rain Showers", icon: "🌦️" },
  95: { condition: "Thunderstorm", icon: "⛈️" },
};

function decodeWMO(code: number) {
  return WMO_CODES[code] ?? { condition: "Unknown", icon: "🌡️" };
}

export async function GET() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&forecast_days=5&timezone=auto`;

    const res = await fetch(url, { next: { revalidate: 900 } }); // 15-min cache
    if (!res.ok) throw new Error("Open-Meteo fetch failed");

    const data = await res.json();
    const cur = data.current;
    const daily = data.daily;

    const current = decodeWMO(cur.weather_code);

    const forecast = daily.time.slice(0, 5).map((date: string, i: number) => {
      const f = decodeWMO(daily.weather_code[i]);
      return {
        date,
        high: Math.round(daily.temperature_2m_max[i]),
        low: Math.round(daily.temperature_2m_min[i]),
        condition: f.condition,
        icon: f.icon,
      };
    });

    return NextResponse.json({
      temperature: Math.round(cur.temperature_2m),
      feelsLike: Math.round(cur.apparent_temperature),
      condition: current.condition,
      icon: current.icon,
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      high: Math.round(daily.temperature_2m_max[0]),
      low: Math.round(daily.temperature_2m_min[0]),
      forecast,
    });
  } catch (err) {
    console.error("Weather API error:", err);
    return NextResponse.json({ error: "Failed to fetch weather" }, { status: 500 });
  }
}
