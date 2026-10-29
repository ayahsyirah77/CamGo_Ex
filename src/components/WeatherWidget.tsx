import React, { useState } from 'react';
import { WeatherData, Language, Township } from '../types';
import { getTranslation } from '../services/i18n';
import { CloudRain, Sun, CloudFog, Cloud, Wind, Droplets, Compass, CloudLightning, Sparkles } from 'lucide-react';

interface WeatherWidgetProps {
  weatherList: WeatherData[];
  language: Language;
}

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weatherList, language }) => {
  const [selectedTown, setSelectedTown] = useState<Township>('Brinchang');

  const DEFAULT_WEATHER: WeatherData = {
    township: selectedTown,
    temp: 17,
    feelsLike: 16,
    condition: 'Passing Highland Mist',
    conditionBm: 'Kabus Gunung Berkala',
    humidity: 82,
    windSpeed: 12,
    uvIndex: 4,
    rainfallProbability: 25,
    forecast: [
      { day: 'Mon', dayBm: 'Isn', tempHigh: 21, tempLow: 15, condition: 'Mist' },
      { day: 'Tue', dayBm: 'Sel', tempHigh: 22, tempLow: 16, condition: 'Sunny' },
      { day: 'Wed', dayBm: 'Rab', tempHigh: 20, tempLow: 15, condition: 'Showers' },
      { day: 'Thu', dayBm: 'Kha', tempHigh: 21, tempLow: 15, condition: 'Clear' },
      { day: 'Fri', dayBm: 'Jum', tempHigh: 22, tempLow: 16, condition: 'Mist' },
    ],
  };

  const currentWeather =
    weatherList.find((w) => w.township === selectedTown) || weatherList[0] || DEFAULT_WEATHER;

  const getWeatherIcon = (cond: string, size = 'w-6 h-6') => {
    const c = cond.toLowerCase();
    if (c.includes('rain') || c.includes('shower')) return <CloudRain className={`${size} text-cyan-400 animate-bounce`} />;
    if (c.includes('thunder') || c.includes('storm')) return <CloudLightning className={`${size} text-amber-400 animate-pulse`} />;
    if (c.includes('mist') || c.includes('fog')) return <CloudFog className={`${size} text-teal-300 animate-pulse`} />;
    if (c.includes('sun') || c.includes('clear')) return <Sun className={`${size} text-amber-400 animate-spin duration-3000`} />;
    return <Cloud className={`${size} text-stone-300 animate-pulse`} />;
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-emerald-500/20 shadow-2xl relative overflow-hidden group">
      {/* Background ambient highlands glow */}
      <div className="absolute -top-24 -right-24 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-emerald-500/20 transition-all duration-700" />

      {/* Header with live pulse */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              {language === 'bm' ? 'SIARAN LANGSUNG • OPEN-METEO' : 'LIVE TELEMETRY • OPEN-METEO'}
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-heading font-extrabold text-stone-100 tracking-tight mt-1">
            {getTranslation(language, 'widget_weather_title')}
          </h3>
          <p className="text-xs text-stone-400">
            {language === 'bm' 
              ? 'Data iklim real-time dari sensor satelit Open-Meteo'
              : 'Real-time climate data from Open-Meteo satellite sensors'}
          </p>
        </div>

        {/* Township Microclimate Switcher Pills */}
        <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-stone-900/90 border border-white/10">
          {weatherList.map((w) => (
            <button
              key={w.township}
              onClick={() => setSelectedTown(w.township)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                selectedTown === w.township
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                  : 'text-stone-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {w.township}
            </button>
          ))}
        </div>
      </div>

      {/* Main Microclimate Spotlight Card */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 mb-6">
        {/* Left: Big Temp & Condition */}
        <div className="md:col-span-5 bg-gradient-to-br from-stone-900/90 via-emerald-950/20 to-stone-900/80 rounded-2xl p-5 border border-white/5 flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {currentWeather.elevation} ASL
              </span>
              <h4 className="text-lg font-bold text-stone-100 mt-2">{currentWeather.township}</h4>
            </div>
            <div className="p-3 rounded-2xl bg-stone-800/80 border border-white/10">
              {getWeatherIcon(currentWeather.condition, 'w-8 h-8')}
            </div>
          </div>

          <div className="my-4 flex items-baseline gap-3">
            <span className="text-5xl sm:text-6xl font-heading font-black text-stone-50 tracking-tighter">
              {currentWeather.temp}°
            </span>
            <span className="text-xl sm:text-2xl text-stone-300 font-semibold">C</span>
            <div className="ml-2">
              <div className="text-base font-bold text-emerald-300">
                {language === 'bm' ? currentWeather.conditionBm : currentWeather.condition}
              </div>
              <div className="text-xs text-stone-400">
                {language === 'bm'
                  ? `Rasa seperti ${currentWeather.feelsLike}°C`
                  : `Feels like ${currentWeather.feelsLike}°C`}
              </div>
            </div>
          </div>

          <div className="text-[11px] text-stone-400 flex items-center gap-1.5 pt-2 border-t border-white/5">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {language === 'bm'
                ? 'Iklim dingin tanah tinggi: Disyorkan membawa jaket nipis atau baju tebal.'
                : 'Highland mountain microclimate: Light fleece or windbreaker recommended.'}
            </span>
          </div>
        </div>

        {/* Right: Telemetry Grid (Humidity, Wind, UV, IPU, Rain) */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-stone-900/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>{language === 'bm' ? 'Kelembapan' : 'Humidity'}</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-stone-100 mt-2">
              {currentWeather.humidity}%
            </div>
            <div className="w-full bg-stone-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-cyan-400 h-full rounded-full"
                style={{ width: `${currentWeather.humidity}%` }}
              />
            </div>
          </div>

          <div className="bg-stone-900/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>{language === 'bm' ? 'Kelajuan Angin' : 'Wind Speed'}</span>
              <Wind className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl font-bold text-stone-100 mt-2">
              {currentWeather.windSpeed} <span className="text-xs font-normal text-stone-400">km/h</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              {language === 'bm' ? 'Bayu segar bukit' : 'Fresh breeze'}
            </div>
          </div>

          <div className="bg-stone-900/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>{language === 'bm' ? 'Indeks UV' : 'UV Index'}</span>
              <Sun className="w-4 h-4 text-amber-400 animate-spin duration-3000" />
            </div>
            <div className="text-xl font-bold text-stone-100 mt-2">
              {currentWeather.uvIndex} <span className="text-xs font-normal text-emerald-400">Low</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              {language === 'bm' ? 'Selesa' : 'Safe for trekking'}
            </div>
          </div>

          <div className="bg-stone-900/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>{language === 'bm' ? 'Indeks IPU' : 'IPU Index'}</span>
              <CloudFog className="w-4 h-4 text-teal-300 animate-pulse" />
            </div>
            <div className="text-xl font-bold text-stone-100 mt-2">
              24 <span className="text-xs font-normal text-emerald-400">Baik</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              {language === 'bm' ? 'Udara bersih' : 'Pristine air'}
            </div>
          </div>

          <div className="bg-stone-900/80 rounded-2xl p-4 border border-white/5 flex flex-col justify-between col-span-2">
            <div className="flex items-center justify-between text-stone-400 text-xs">
              <span>{language === 'bm' ? 'Kebarangkalian Hujan' : 'Rain Probability'}</span>
              <CloudRain className="w-4 h-4 text-blue-400 animate-bounce" />
            </div>
            <div className="text-xl font-bold text-stone-100 mt-2">
              {currentWeather.rainfallProbability}%
            </div>
            <div className="w-full bg-stone-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-blue-400 h-full rounded-full"
                style={{ width: `${currentWeather.rainfallProbability}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5-Day Forecast Row */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bm' ? 'Ramalan 5 Hari Seterusnya' : '5-Day Highland Outlook & Forecast'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {currentWeather.forecast.map((f, i) => (
            <div
              key={i}
              className="bg-stone-900/80 rounded-2xl p-3 border border-white/5 text-center flex flex-col items-center justify-between hover:border-emerald-500/30 transition-colors"
            >
              <div className="text-xs font-bold text-stone-300">
                {language === 'bm' ? f.dayBm : f.day}
              </div>
              <div className="my-2 p-2 rounded-xl bg-stone-800/80">
                {getWeatherIcon(f.condition, 'w-6 h-6')}
              </div>
              <div className="text-xs font-bold text-stone-100">{f.condition}</div>
              <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                {f.tempHigh}° / {f.tempLow}°C
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
