import React, { useState, useMemo } from 'react';
import { WeatherData, Language, Township, WeatherForecastDay } from '../types';
import { getTranslation } from '../services/i18n';
import {
  CloudRain,
  Sun,
  CloudFog,
  Cloud,
  Wind,
  Droplets,
  Compass,
  CloudLightning,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Car,
  Eye,
  ChevronDown,
  ChevronUp,
  Gauge,
  Info,
} from 'lucide-react';

export interface WeatherWidgetProps {
  weatherList: WeatherData[];
  language: Language;
}

export interface WeatherSafetyImpact {
  level: 'critical' | 'warning' | 'caution' | 'optimal';
  badgeLabel: string;
  badgeLabelBm: string;
  headline: string;
  headlineBm: string;
  summary: string;
  summaryBm: string;
  roadSlippage: {
    level: 'high' | 'moderate' | 'low';
    label: string;
    labelBm: string;
    detail: string;
    detailBm: string;
  };
  windImpact: {
    level: 'high' | 'moderate' | 'calm';
    label: string;
    labelBm: string;
    detail: string;
    detailBm: string;
  };
  visibilityImpact: {
    level: 'low' | 'moderate' | 'clear';
    label: string;
    labelBm: string;
    detail: string;
    detailBm: string;
  };
  specificWarnings: Array<{
    id: string;
    factor: 'precipitation' | 'wind' | 'visibility' | 'optimal';
    title: string;
    titleBm: string;
    message: string;
    messageBm: string;
    actionTip: string;
    actionTipBm: string;
  }>;
}

/**
 * Analyzes live weather telemetry (precipitation, wind speed, humidity, cloud conditions)
 * and generates contextual highland safety impact warnings for drivers and tourists.
 */
export const analyzeWeatherSafety = (weather: WeatherData): WeatherSafetyImpact => {
  const cond = (weather.condition || '').toLowerCase();
  const condBm = (weather.conditionBm || '').toLowerCase();
  const rainProb = weather.rainfallProbability ?? 0;
  const wind = weather.windSpeed ?? 0;
  const humidity = weather.humidity ?? 0;

  const isThunderstorm =
    cond.includes('thunder') ||
    cond.includes('storm') ||
    cond.includes('hail') ||
    condBm.includes('petir') ||
    condBm.includes('ribut');

  const isHeavyRain =
    isThunderstorm ||
    cond.includes('heavy rain') ||
    cond.includes('violent') ||
    condBm.includes('lebat') ||
    (rainProb >= 70 && (cond.includes('rain') || cond.includes('shower') || condBm.includes('hujan')));

  const isModerateRain =
    !isHeavyRain &&
    (cond.includes('rain') ||
      cond.includes('shower') ||
      cond.includes('drizzle') ||
      condBm.includes('hujan') ||
      condBm.includes('renyai') ||
      rainProb >= 40);

  const isHighWind = wind >= 28;
  const isModerateWind = wind >= 18 && wind < 28;
  const isDenseFog =
    cond.includes('fog') ||
    cond.includes('mist') ||
    condBm.includes('kabus') ||
    (humidity >= 86 && (cond.includes('cloud') || cond.includes('overcast') || condBm.includes('mendung')));

  // Determine Overall Threat Level
  let level: WeatherSafetyImpact['level'] = 'optimal';
  if (isThunderstorm || (isHeavyRain && isHighWind)) {
    level = 'critical';
  } else if (isHeavyRain || isHighWind) {
    level = 'warning';
  } else if (isModerateRain || isDenseFog || isModerateWind) {
    level = 'caution';
  } else {
    level = 'optimal';
  }

  // 1. Road Surface & Traction Vector
  const roadSlippage = isHeavyRain
    ? {
        level: 'high' as const,
        label: 'High Slippage Risk',
        labelBm: 'Risiko Gelincir Tinggi',
        detail:
          'Heavy rain, potential road slippage: Drive with caution. Aquaplaning danger and long braking distances on winding mountain hairpins (FT 59 & FT 185).',
        detailBm:
          'Hujan lebat, potensi jalan licin dan tergelincir: Pandu dengan berhati-hati. Bahaya akuaplaning dan jarak membrek panjang di selekoh bukit (FT 59 & FT 185).',
      }
    : isModerateRain
    ? {
        level: 'moderate' as const,
        label: 'Moderate Slickness',
        labelBm: 'Licin Sederhana',
        detail:
          'Damp asphalt with reduced tyre friction. Downshift to lower gears on steep slopes to prevent brake fade.',
        detailBm:
          'Permukaan asfalt lembap dengan cengkaman tayar berkurangan. Gunakan gear rendah di laluan curam bagi mengelakkan kepanasan brek.',
      }
    : {
        level: 'low' as const,
        label: 'Stable Road Traction',
        labelBm: 'Cengkaman Jalan Mantap',
        detail:
          'Dry pavement and reliable braking friction across all 9 highland townships.',
        detailBm:
          'Permukaan jalan kering dengan cengkaman membrek yang kukuh di semua 9 mukim tanah tinggi.',
      };

  // 2. Mountain Wind Impact Vector
  const windImpact = isHighWind
    ? {
        level: 'high' as const,
        label: `High Gusts (${wind} km/h)`,
        labelBm: `Tiupan Kencang (${wind} km/j)`,
        detail:
          'Strong ridge gusts detected. Crosswind drift hazard on exposed viaducts, bridge passes, and ridge crests.',
        detailBm:
          'Tiupan angin permatang kencang. Bahaya angin lintang di jambatan terbuka, rabung bukit, dan laluan curam.',
      }
    : isModerateWind
    ? {
        level: 'moderate' as const,
        label: `Breezy (${wind} km/h)`,
        labelBm: `Berangin (${wind} km/j)`,
        detail:
          'Moderate mountain air currents. Motorcyclists and campers should maintain center lane position and secure gear.',
        detailBm:
          'Aliran udara pergunungan sederhana. Penunggang motosikal dan pengunjung berkhemah dinasihatkan mengikat muatan.',
      }
    : {
        level: 'calm' as const,
        label: `Gentle Breeze (${wind} km/h)`,
        labelBm: `Bayu Tenang (${wind} km/j)`,
        detail:
          'Calm highland valley breeze with zero aerodynamic disturbance for vehicles.',
        detailBm:
          'Bayu lembah tanah tinggi yang tenang tanpa sebarang gangguan aerodinamik pada kenderaan.',
      };

  // 3. Sightline & Fog Visibility Vector
  const visibilityImpact = isDenseFog
    ? {
        level: 'low' as const,
        label: 'Dense Mist / Low Sight',
        labelBm: 'Kabus Tebal / Pandangan Terhad',
        detail: `High moisture saturation (${humidity}% humidity) reducing sightline below 35m on hilltop turns. Dipped headlights mandatory.`,
        detailBm: `Kelembapan tepu (${humidity}%) mengurangkan jarak pandang bawah 35m di selekoh puncak. Lampu hadapan rendah diwajibkan.`,
      }
    : isModerateRain
    ? {
        level: 'moderate' as const,
        label: 'Rain Spray Reduction',
        labelBm: 'Percikan Air Kenderaan',
        detail:
          'Road spray from preceding heavy agricultural lorries reduces forward visibility.',
        detailBm:
          'Percikan air daripada lori sayur di hadapan mengurangkan jarak penglihatan depan.',
      }
    : {
        level: 'clear' as const,
        label: 'Clear Sightlines',
        labelBm: 'Penglihatan Jelas',
        detail:
          'Crisp mountain visibility with clear forward horizon across mountain passes.',
        detailBm:
          'Jarak pandangan pergunungan yang terang dan jelas di sepanjang laluan.',
      };

  // 4. Specific Actionable Warning Cards
  const specificWarnings: WeatherSafetyImpact['specificWarnings'] = [];

  if (isHeavyRain || isThunderstorm) {
    specificWarnings.push({
      id: 'warn-heavy-rain',
      factor: 'precipitation',
      title: 'Heavy Rain & Road Slippage Alert',
      titleBm: 'Amaran Hujan Lebat & Risiko Jalan Gelincir',
      message:
        'Heavy rain, potential road slippage: Drive with caution. Wet asphalt significantly reduces tyre grip along winding mountain descents.',
      messageBm:
        'Hujan lebat, potensi jalan licin dan tergelincir: Pandu dengan berhati-hati. Asfalt basah mengurangkan cengkaman tayar di laluan cerun.',
      actionTip:
        'Cap vehicle speed at 35 km/h, avoid sharp sudden steering inputs, and keep a 4-second minimum following gap behind preceding vehicles.',
      actionTipBm:
        'Hadkan kelajuan kepada 35 km/j, elak pergerakan stereng mengejut, dan kekalkan jarak sekurang-kurangnya 4 saat di belakang kenderaan lain.',
    });
  } else if (isModerateRain) {
    specificWarnings.push({
      id: 'warn-moderate-rain',
      factor: 'precipitation',
      title: 'Wet Pavement Caution',
      titleBm: 'Langkah Berwaspada Jalan Basah',
      message:
        'Precipitation detected with damp road surface. Mountain curves have elevated skid potential during sudden braking.',
      messageBm:
        'Hujan dikesan dengan permukaan jalan basah. Selekoh bukit berisiko tergelincir jika membrek secara mendadak.',
      actionTip:
        'Brake gradually before approaching bends rather than braking while turning. Ensure tyre treads are in good condition.',
      actionTipBm:
        'Brek secara beransur-ansur sebelum selekoh dan bukan semasa membelok. Pastikan bunga tayar dalam keadaan baik.',
    });
  }

  if (isHighWind) {
    specificWarnings.push({
      id: 'warn-wind',
      factor: 'wind',
      title: 'High Mountain Wind Gust Advisory',
      titleBm: 'Nasihat Tiupan Angin Kencang Bukit',
      message: `Strong wind velocity of ${wind} km/h recorded. High-profile vehicles, SUVs, and motorbikes may experience sudden lateral drift.`,
      messageBm: `Kelajuan angin ${wind} km/j direkodkan. Kenderaan berbadan tinggi, SUV dan motosikal terdedah kepada tolakan angin lintang.`,
      actionTip:
        'Grip steering wheel firmly with both hands. Watch for small fallen tree branches or slope debris along jungle-lined road corridors.',
      actionTipBm:
        'Pegang stereng dengan kemas kedua-dua belah tangan. Awasi ranting pokok patah atau serpihan batuan di laluan berhampiran tebing.',
    });
  }

  if (isDenseFog) {
    specificWarnings.push({
      id: 'warn-fog',
      factor: 'visibility',
      title: 'Highland Mist & Low Visibility Precaution',
      titleBm: 'Langkah Berjaga-jaga Kabus Tebal',
      message: `Dense highland fog rolling across ${weather.township} at ${weather.elevation || 'high elevation'}. Oncoming vehicle reaction time halved.`,
      messageBm: `Kabus tebal melitupi kawasan ${weather.township} di ketinggian ${weather.elevation || 'tanah tinggi'}. Masa reaksi kenderaan bertentangan terjejas.`,
      actionTip:
        'Turn on front & rear fog lamps. NEVER turn on hazard lights while in motion as it conceals turn signals. Sound horn softly on narrow blind turns.',
      actionTipBm:
        'Gunakan lampu kabus depan & belakang. JANGAN hidupkan lampu kecemasan ketika bergerak. Bunyikan hon perlahan di selekoh tajam.',
    });
  }

  if (specificWarnings.length === 0) {
    specificWarnings.push({
      id: 'warn-optimal',
      factor: 'optimal',
      title: 'Optimal Mountain Travel Conditions',
      titleBm: 'Keadaan Perjalanan Tanah Tinggi Optimum',
      message:
        'Current precipitation (0%) and wind speeds are within tranquil parameters. Road surfaces are dry with maximum cornering traction.',
      messageBm:
        'Kadar kerpasan dan kelajuan angin berada pada tahap selamat dan tenang. Permukaan jalan kering dengan cengkaman maksimum.',
      actionTip:
        'Excellent conditions for scenic mountain touring, strawberry farm visits, and outdoor nature trail expeditions.',
      actionTipBm:
        'Keadaan terbaik untuk bersiar-siar di ladang teh, memetik strawberi, dan aktiviti mendaki laluan alam semulajadi.',
    });
  }

  // Set headline and summary based on level
  let headline = 'Optimal Mountain Travel Conditions';
  let headlineBm = 'Keadaan Perjalanan Tanah Tinggi Optimum';
  let summary =
    'Dry road surfaces with stable tyre traction and clear visibility across highland passes.';
  let summaryBm =
    'Permukaan jalan kering dengan cengkaman tayar mantap dan jarak penglihatan terang.';
  let badgeLabel = 'OPTIMAL TRAVEL';
  let badgeLabelBm = 'PERJALANAN OPTIMUM';

  if (level === 'critical') {
    headline = 'Severe Weather Alert • High Road Hazard';
    headlineBm = 'Amaran Cuaca Buruk • Bahaya Tinggi Di Jalan Raya';
    summary =
      'Heavy rain, potential road slippage & high wind gusts: Extreme caution required on all highland routes.';
    summaryBm =
      'Hujan lebat, potensi jalan licin & tiupan angin kencang: Berhati-hati sepenuhnya di semua laluan tanah tinggi.';
    badgeLabel = 'CRITICAL ADVISORY';
    badgeLabelBm = 'AMARAN KRITIKAL';
  } else if (level === 'warning') {
    headline = 'Weather Impact Warning • Road Slippage Hazard';
    headlineBm = 'Amaran Impak Cuaca • Risiko Jalan Gelincir';
    summary =
      'Heavy rain, potential road slippage: Drive with caution. Wet mountain roads reduce braking grip.';
    summaryBm =
      'Hujan lebat, potensi jalan licin dan tergelincir: Pandu dengan berhati-hati. Jalan bukit basah mengurangkan cengkaman brek.';
    badgeLabel = 'SAFETY WARNING';
    badgeLabelBm = 'AMARAN KESELAMATAN';
  } else if (level === 'caution') {
    headline = 'Microclimate Precaution • Caution Advised';
    headlineBm = 'Langkah Berjaga-jaga • Disarankan Berwaspada';
    summary =
      'Damp asphalt, fresh mountain winds, or localized fog detected. Keep headlights on and descend with caution.';
    summaryBm =
      'Jalan lembap, angin pergunungan, atau kabus setempat dikesan. Pasang lampu dan turun bukit dengan cermat.';
    badgeLabel = 'EXERCISE CAUTION';
    badgeLabelBm = 'SILA BERWASPADA';
  }

  return {
    level,
    badgeLabel,
    badgeLabelBm,
    headline,
    headlineBm,
    summary,
    summaryBm,
    roadSlippage,
    windImpact,
    visibilityImpact,
    specificWarnings,
  };
};

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ weatherList, language }) => {
  const [selectedTown, setSelectedTown] = useState<Township>('Brinchang');
  const [activeSimulation, setActiveSimulation] = useState<'live' | 'heavy_rain' | 'high_wind' | 'dense_fog'>('live');
  const [showAllAdvisories, setShowAllAdvisories] = useState(false);

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

  const baseWeather =
    weatherList.find((w: WeatherData) => w.township === selectedTown) || weatherList[0] || DEFAULT_WEATHER;

  const currentWeather = useMemo(() => {
    if (activeSimulation === 'heavy_rain') {
      return {
        ...baseWeather,
        condition: 'Heavy Rain & Mountain Downpour',
        conditionBm: 'Hujan Lebat & Limpahan Bukit',
        rainfallProbability: 90,
        windSpeed: 26,
        humidity: 95,
        temp: 14,
        feelsLike: 13,
      };
    }
    if (activeSimulation === 'high_wind') {
      return {
        ...baseWeather,
        condition: 'Windy Ridge Turbulence',
        conditionBm: 'Tiupan Angin Rabung Kencang',
        rainfallProbability: 35,
        windSpeed: 36,
        humidity: 78,
      };
    }
    if (activeSimulation === 'dense_fog') {
      return {
        ...baseWeather,
        condition: 'Dense Mountain Fog',
        conditionBm: 'Kabus Tebal Menyelubungi',
        rainfallProbability: 30,
        windSpeed: 11,
        humidity: 98,
        temp: 13,
        feelsLike: 12,
      };
    }
    return baseWeather;
  }, [baseWeather, activeSimulation]);

  const safetyImpact = useMemo(() => analyzeWeatherSafety(currentWeather), [currentWeather]);

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
          {weatherList.map((w: WeatherData) => (
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
              {currentWeather.windSpeed ?? 12} <span className="text-xs font-normal text-stone-400">km/h</span>
            </div>
            <div className="text-[11px] text-stone-400 mt-1">
              {(currentWeather.windSpeed ?? 0) >= 25
                ? language === 'bm' ? 'Angin pergunungan kencang' : 'Strong mountain gusts'
                : language === 'bm' ? 'Bayu segar bukit' : 'Fresh highland breeze'}
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
                className="bg-blue-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${currentWeather.rainfallProbability}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* NEW FEATURE: Contextual Safety Impact Analysis & Road Slippage Warnings */}
      <div
        className={`mb-6 rounded-3xl p-5 sm:p-6 border transition-all duration-300 shadow-xl ${
          safetyImpact.level === 'critical'
            ? 'bg-gradient-to-br from-red-950/80 via-stone-900/95 to-rose-950/70 border-red-500/50 shadow-red-950/40'
            : safetyImpact.level === 'warning'
            ? 'bg-gradient-to-br from-amber-950/80 via-stone-900/95 to-orange-950/70 border-amber-500/50 shadow-amber-950/40'
            : safetyImpact.level === 'caution'
            ? 'bg-gradient-to-br from-teal-950/70 via-stone-900/95 to-stone-900/95 border-teal-500/40 shadow-teal-950/30'
            : 'bg-gradient-to-br from-emerald-950/60 via-stone-900/95 to-stone-900/95 border-emerald-500/30 shadow-emerald-950/30'
        }`}
      >
        {/* Safety Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                safetyImpact.level === 'critical'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : safetyImpact.level === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : safetyImpact.level === 'caution'
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}
            >
              {safetyImpact.level === 'critical' ? (
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              ) : safetyImpact.level === 'warning' ? (
                <AlertTriangle className="w-6 h-6 animate-bounce" />
              ) : safetyImpact.level === 'caution' ? (
                <Car className="w-6 h-6 text-teal-300" />
              ) : (
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                    safetyImpact.level === 'critical'
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : safetyImpact.level === 'warning'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : safetyImpact.level === 'caution'
                      ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {language === 'bm' ? safetyImpact.badgeLabelBm : safetyImpact.badgeLabel}
                </span>

                <span className="text-xs font-mono text-stone-400">
                  {currentWeather.township} • {currentWeather.elevation}
                </span>
              </div>

              <h4 className="text-base sm:text-lg font-heading font-black text-stone-100 tracking-tight mt-1">
                {language === 'bm' ? safetyImpact.headlineBm : safetyImpact.headline}
              </h4>
            </div>
          </div>

          {/* Scenario Simulation Switcher for instant testing/demonstration */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-stone-950/80 border border-white/10 text-[11px]">
            <span className="text-[10px] font-bold text-stone-400 px-2 uppercase tracking-wider hidden sm:inline">
              {language === 'bm' ? 'Simulasi' : 'Simulate'}:
            </span>
            <button
              onClick={() => setActiveSimulation('live')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSimulation === 'live'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
              title="Real-time Open-Meteo satellite feed"
            >
              {language === 'bm' ? 'Satelit Langsung' : 'Live Satellite'}
            </button>
            <button
              onClick={() => setActiveSimulation('heavy_rain')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSimulation === 'heavy_rain'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
              title="Test heavy rain road slippage warning"
            >
              🌧️ {language === 'bm' ? 'Hujan Lebat' : 'Heavy Rain'}
            </button>
            <button
              onClick={() => setActiveSimulation('high_wind')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSimulation === 'high_wind'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
              title="Test mountain wind gust alert"
            >
              💨 {language === 'bm' ? 'Angin Kencang' : 'High Wind'}
            </button>
            <button
              onClick={() => setActiveSimulation('dense_fog')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                activeSimulation === 'dense_fog'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
              title="Test dense fog low visibility warning"
            >
              🌫️ {language === 'bm' ? 'Kabus Tebal' : 'Dense Fog'}
            </button>
          </div>
        </div>

        {/* Primary Callout Alert Box (e.g., 'Heavy rain, potential road slippage: Drive with caution') */}
        <div
          className={`mt-4 p-4 rounded-2xl border flex items-start gap-3.5 ${
            safetyImpact.level === 'critical'
              ? 'bg-red-950/50 border-red-500/40 text-red-100'
              : safetyImpact.level === 'warning'
              ? 'bg-amber-950/50 border-amber-500/40 text-amber-100'
              : safetyImpact.level === 'caution'
              ? 'bg-teal-950/40 border-teal-500/30 text-teal-100'
              : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-100'
          }`}
        >
          <div
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              safetyImpact.level === 'critical'
                ? 'bg-red-500/20 text-red-400'
                : safetyImpact.level === 'warning'
                ? 'bg-amber-500/20 text-amber-400'
                : safetyImpact.level === 'caution'
                ? 'bg-teal-500/20 text-teal-300'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            <Car className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="text-xs font-mono font-bold uppercase tracking-wider opacity-80 mb-0.5">
              {language === 'bm' ? 'AMARAN IMPAK KESELAMATAN SEMASA' : 'LIVE SAFETY IMPACT WARNING'}
            </div>
            <p className="text-sm sm:text-base font-bold leading-snug">
              {language === 'bm' ? safetyImpact.summaryBm : safetyImpact.summary}
            </p>
            <div className="text-xs opacity-90 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                🌧️ {language === 'bm' ? 'Kerpasan' : 'Precipitation'}:{' '}
                <strong className="underline">{currentWeather.rainfallProbability}%</strong>
              </span>
              <span>
                💨 {language === 'bm' ? 'Kelajuan Angin' : 'Wind Speed'}:{' '}
                <strong className="underline">{currentWeather.windSpeed} km/h</strong>
              </span>
              <span>
                💧 {language === 'bm' ? 'Kelembapan' : 'Humidity'}:{' '}
                <strong className="underline">{currentWeather.humidity}%</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3 Telemetry Impact Matrix Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          {/* 1. Road Surface & Traction Impact */}
          <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span className="font-semibold">{language === 'bm' ? 'Cengkaman Jalan' : 'Road Traction'}</span>
                <Car
                  className={`w-4 h-4 ${
                    safetyImpact.roadSlippage.level === 'high'
                      ? 'text-red-400 animate-pulse'
                      : safetyImpact.roadSlippage.level === 'moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
              </div>
              <div
                className={`text-sm font-bold ${
                  safetyImpact.roadSlippage.level === 'high'
                    ? 'text-red-300'
                    : safetyImpact.roadSlippage.level === 'moderate'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {language === 'bm'
                  ? safetyImpact.roadSlippage.labelBm
                  : safetyImpact.roadSlippage.label}
              </div>
            </div>
            <p className="text-[11px] text-stone-300 mt-2 leading-relaxed">
              {language === 'bm'
                ? safetyImpact.roadSlippage.detailBm
                : safetyImpact.roadSlippage.detail}
            </p>
          </div>

          {/* 2. Mountain Wind Impact */}
          <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span className="font-semibold">{language === 'bm' ? 'Impak Angin' : 'Wind Impact'}</span>
                <Wind
                  className={`w-4 h-4 ${
                    safetyImpact.windImpact.level === 'high'
                      ? 'text-amber-400 animate-pulse'
                      : safetyImpact.windImpact.level === 'moderate'
                      ? 'text-teal-300'
                      : 'text-emerald-400'
                  }`}
                />
              </div>
              <div
                className={`text-sm font-bold ${
                  safetyImpact.windImpact.level === 'high'
                    ? 'text-amber-300'
                    : safetyImpact.windImpact.level === 'moderate'
                    ? 'text-teal-300'
                    : 'text-emerald-300'
                }`}
              >
                {language === 'bm' ? safetyImpact.windImpact.labelBm : safetyImpact.windImpact.label}
              </div>
            </div>
            <p className="text-[11px] text-stone-300 mt-2 leading-relaxed">
              {language === 'bm'
                ? safetyImpact.windImpact.detailBm
                : safetyImpact.windImpact.detail}
            </p>
          </div>

          {/* 3. Mountain Visibility & Fog Impact */}
          <div className="p-3.5 rounded-2xl bg-stone-900/80 border border-white/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-stone-400 mb-1.5">
                <span className="font-semibold">{language === 'bm' ? 'Jarak Penglihatan' : 'Sight Distance'}</span>
                <Eye
                  className={`w-4 h-4 ${
                    safetyImpact.visibilityImpact.level === 'low'
                      ? 'text-teal-300 animate-pulse'
                      : safetyImpact.visibilityImpact.level === 'moderate'
                      ? 'text-amber-400'
                      : 'text-emerald-400'
                  }`}
                />
              </div>
              <div
                className={`text-sm font-bold ${
                  safetyImpact.visibilityImpact.level === 'low'
                    ? 'text-teal-300'
                    : safetyImpact.visibilityImpact.level === 'moderate'
                    ? 'text-amber-300'
                    : 'text-emerald-300'
                }`}
              >
                {language === 'bm'
                  ? safetyImpact.visibilityImpact.labelBm
                  : safetyImpact.visibilityImpact.label}
              </div>
            </div>
            <p className="text-[11px] text-stone-300 mt-2 leading-relaxed">
              {language === 'bm'
                ? safetyImpact.visibilityImpact.detailBm
                : safetyImpact.visibilityImpact.detail}
            </p>
          </div>
        </div>

        {/* Expandable Actionable Safety Recommendations */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <button
            onClick={() => setShowAllAdvisories((prev) => !prev)}
            className="w-full flex items-center justify-between text-xs font-bold text-stone-300 hover:text-white transition-colors cursor-pointer group"
          >
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" />
              <span>
                {language === 'bm'
                  ? `Panduan Pemanduan & Keselamatan Terperinci (${safetyImpact.specificWarnings.length} Arahan)`
                  : `Actionable Safety Guidelines & Protocols (${safetyImpact.specificWarnings.length} Directives)`}
              </span>
            </span>
            <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold group-hover:underline">
              <span>{showAllAdvisories ? (language === 'bm' ? 'Sembunyi' : 'Hide') : (language === 'bm' ? 'Papar Semua' : 'View Details')}</span>
              {showAllAdvisories ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showAllAdvisories && (
            <div className="space-y-2.5 mt-3 animate-in fade-in slide-in-from-top-2 duration-200">
              {safetyImpact.specificWarnings.map((warn) => (
                <div
                  key={warn.id}
                  className="p-3.5 rounded-2xl bg-stone-950/80 border border-white/10 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-stone-100 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>{language === 'bm' ? warn.titleBm : warn.title}</span>
                    </span>
                    <span className="text-[10px] font-mono uppercase text-stone-400 px-2 py-0.5 rounded bg-white/5">
                      {warn.factor}
                    </span>
                  </div>
                  <p className="text-xs text-stone-300 leading-relaxed">
                    {language === 'bm' ? warn.messageBm : warn.message}
                  </p>
                  <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-[11.5px] text-emerald-200 font-medium">
                    <strong className="text-emerald-300 font-bold">
                      {language === 'bm' ? 'Tindakan Disyorkan: ' : 'Recommended Action: '}
                    </strong>
                    {language === 'bm' ? warn.actionTipBm : warn.actionTip}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5-Day Forecast Row */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3 flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>{language === 'bm' ? 'Ramalan 5 Hari Seterusnya' : '5-Day Highland Outlook & Forecast'}</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {currentWeather.forecast.map((f: WeatherForecastDay, i: number) => (
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
