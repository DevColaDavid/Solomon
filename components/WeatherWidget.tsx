"use client";

import { useEffect, useState } from "react";
import type { WeatherData } from "@/types";

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/weather")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setWeather(d); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111116] h-32 flex items-center justify-center" style={{ padding: '1rem' }}>
      <div className="w-4 h-4 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
    </div>
  );
  if (!weather) return null;

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#111116]" style={{ padding: '1rem' }}>
      {/* Label */}
      <p className="text-[9px] font-semibold tracking-[0.15em] text-zinc-600 uppercase mb-3">Weather</p>

      {/* Current */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-end gap-1 leading-none mb-1">
            <span className="text-4xl font-bold text-zinc-100">{weather.temperature}°</span>
            <span className="text-sm text-zinc-600 mb-1">C</span>
          </div>
          <p className="text-xs text-zinc-500">{weather.condition}</p>
          <p className="text-[10px] text-zinc-700 mt-0.5">Feels like {weather.feelsLike}°</p>
        </div>
        <span className="text-4xl leading-none">{weather.icon}</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 py-3 border-y border-white/[0.04] mb-3">
        {[
          { label: "High",     val: `${weather.high}°` },
          { label: "Humidity", val: `${weather.humidity}%` },
          { label: "Wind",     val: `${weather.windSpeed}km/h` },
        ].map(({ label, val }) => (
          <div key={label} className="text-center">
            <p className="text-[9px] text-zinc-700 uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xs font-semibold text-cyan-400">{val}</p>
          </div>
        ))}
      </div>

      {/* Forecast */}
      <div className="flex gap-0.5">
        {weather.forecast.map((day) => (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1 py-1 rounded-lg hover:bg-white/[0.03] transition-colors">
            <p className="text-[9px] text-zinc-700 uppercase">
              {new Date(day.date + "T12:00:00").toLocaleDateString("en", { weekday: "short" })}
            </p>
            <span className="text-sm">{day.icon}</span>
            <p className="text-[10px] font-semibold text-zinc-300">{day.high}°</p>
            <p className="text-[9px] text-zinc-600">{day.low}°</p>
          </div>
        ))}
      </div>
    </div>
  );
}
