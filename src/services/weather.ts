import { WeatherData, WeatherForecastDay, Township } from '../types';

const TOWNSHIP_COORDS: Record<Township, { lat: number; lng: number; elevation: string }> = {
  'Tanah Rata': { lat: 4.4692, lng: 101.3761, elevation: '1,440m' },
  'Brinchang': { lat: 4.4914, lng: 101.3889, elevation: '1,540m' },
  'Kea Farm': { lat: 4.5085, lng: 101.4095, elevation: '1,610m' },
  'Ringlet': { lat: 4.4125, lng: 101.3847, elevation: '1,135m' },
  'Kampung Raja': { lat: 4.5369, lng: 101.4053, elevation: '1,280m' },
  'Tringkap': { lat: 4.5122, lng: 101.4239, elevation: '1,490m' },
  'Kuala Terla': { lat: 4.5306, lng: 101.4111, elevation: '1,320m' },
  'Bertam Valley': { lat: 4.4167, lng: 101.4000, elevation: '1,080m' },
  'Blue Valley': { lat: 4.5667, lng: 101.4000, elevation: '1,350m' },
};

const WMO_MAPPING: Record<number, { condition: string; conditionBm: string }> = {
  0: { condition: 'Clear Sky', conditionBm: 'Langit Cerah' },
  1: { condition: 'Mainly Clear', conditionBm: 'Kebanyakannya Cerah' },
  2: { condition: 'Partly Cloudy', conditionBm: 'Separa Berawan' },
  3: { condition: 'Overcast', conditionBm: 'Mendung' },
  45: { condition: 'Foggy', conditionBm: 'Berkabus' },
  48: { condition: 'Depositing Rime Fog', conditionBm: 'Kabus Tebal' },
  51: { condition: 'Light Drizzle', conditionBm: 'Gerimis Ringan' },
  53: { condition: 'Moderate Drizzle', conditionBm: 'Gerimis Sederhana' },
  55: { condition: 'Dense Drizzle', conditionBm: 'Gerimis Lebat' },
  61: { condition: 'Slight Rain', conditionBm: 'Hujan Ringan' },
  63: { condition: 'Moderate Rain', conditionBm: 'Hujan Sederhana' },
  65: { condition: 'Heavy Rain', conditionBm: 'Hujan Lebat' },
  71: { condition: 'Slight Snow', conditionBm: 'Salji Ringan' },
  73: { condition: 'Moderate Snow', conditionBm: 'Salji Sederhana' },
  75: { condition: 'Heavy Snow', conditionBm: 'Salji Lebat' },
  77: { condition: 'Snow Grains', conditionBm: 'Butiran Salji' },
  80: { condition: 'Slight Showers', conditionBm: 'Hujan Renyai' },
  81: { condition: 'Moderate Showers', conditionBm: 'Hujan Sederhana' },
  82: { condition: 'Violent Showers', conditionBm: 'Hujan Sangat Lebat' },
  95: { condition: 'Thunderstorm', conditionBm: 'Ribut Petir' },
  96: { condition: 'Thunderstorm with Hail', conditionBm: 'Ribut Petir & Hujan Batu' },
  99: { condition: 'Heavy Thunderstorm with Hail', conditionBm: 'Ribut Petir Hebat & Hujan Batu' },
};

const getDayName = (dateStr: string, lang: 'en' | 'bm'): string => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = { weekday: 'short' };
  const day = date.toLocaleDateString('en-US', options);
  
  if (lang === 'bm') {
    const mapping: Record<string, string> = {
      'Mon': 'Isn',
      'Tue': 'Sel',
      'Wed': 'Rab',
      'Thu': 'Kha',
      'Fri': 'Jum',
      'Sat': 'Sab',
      'Sun': 'Ahad',
    };
    return mapping[day] || day;
  }
  return day;
};

export interface TrailSafetyStatus {
  isSafe: boolean;
  reason: string;
  reasonBm: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  currentWeather?: {
    temp: number;
    condition: string;
    conditionBm: string;
    windSpeed: number;
    rainProbability: number;
    weatherCode: number;
  };
}

export const weatherService = {
  async fetchLiveWeather(): Promise<WeatherData[]> {
    const townships = Object.keys(TOWNSHIP_COORDS) as Township[];
    const latitudes = townships.map(t => TOWNSHIP_COORDS[t].lat).join(',');
    const longitudes = townships.map(t => TOWNSHIP_COORDS[t].lng).join(',');

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitudes}&longitude=${longitudes}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max&timezone=Asia%2FKuala_Lumpur`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      const results = Array.isArray(data) ? data : [data];

      return results.map((item: any, index: number) => {
        const township = townships[index];
        const current = item.current;
        const daily = item.daily;
        
        const mappedCondition = WMO_MAPPING[current.weather_code] || { condition: 'Clear', conditionBm: 'Cerah' };

        const forecast: WeatherForecastDay[] = daily.time.slice(0, 5).map((time: string, i: number) => {
          const dayCondition = WMO_MAPPING[daily.weather_code[i]] || { condition: 'Clear', conditionBm: 'Cerah' };
          return {
            day: getDayName(time, 'en'),
            dayBm: getDayName(time, 'bm'),
            tempHigh: Math.round(daily.temperature_2m_max[i]),
            tempLow: Math.round(daily.temperature_2m_min[i]),
            condition: dayCondition.condition,
            conditionBm: dayCondition.conditionBm,
          };
        });

        return {
          township,
          temp: Math.round(current.temperature_2m),
          feelsLike: Math.round(current.apparent_temperature),
          elevation: TOWNSHIP_COORDS[township].elevation,
          condition: mappedCondition.condition,
          conditionBm: mappedCondition.conditionBm,
          humidity: current.relative_humidity_2m,
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex: Math.round(daily.uv_index_max[0]),
          rainfallProbability: daily.precipitation_probability_max[0],
          forecast,
        };
      });
    } catch (error) {
      console.error('Error fetching weather from Open-Meteo:', error);
      return [];
    }
  },

  async evaluateTrailSafety(): Promise<TrailSafetyStatus> {
    // Default coordinates for Cameron Highlands (Tanah Rata area)
    const lat = 4.4692;
    const lng = 101.3761;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m&daily=precipitation_probability_max&timezone=Asia%2FKuala_Lumpur`;

    try {
      const response = await fetch(url);
      const data = await response.json();
      const current = data.current;
      const daily = data.daily;
      const weatherCode = current.weather_code;
      const windSpeed = current.wind_speed_10m;
      const rainProb = daily.precipitation_probability_max[0];
      const temp = current.temperature_2m;

      const mappedCondition = WMO_MAPPING[weatherCode] || { condition: 'Clear', conditionBm: 'Cerah' };

      let isSafe = true;
      let reason = 'Weather conditions are stable for trekking.';
      let reasonBm = 'Keadaan cuaca stabil untuk pendakian.';
      let severity: 'low' | 'moderate' | 'high' | 'critical' = 'low';

      // 1. Critical Weather (Thunderstorms, Heavy Rain)
      if (weatherCode >= 95 || weatherCode === 65 || weatherCode === 82) {
        isSafe = false;
        severity = 'critical';
        reason = 'Severe weather alert: Thunderstorms or heavy rain detected. Risk of lightning and flash floods.';
        reasonBm = 'Amaran cuaca buruk: Ribut petir atau hujan lebat dikesan. Risiko kilat dan kepala air.';
      } 
      // 2. High Risk (Moderate Rain, High Wind)
      else if (weatherCode >= 61 || windSpeed > 30) {
        isSafe = false;
        severity = 'high';
        reason = `High risk: ${mappedCondition.condition} and high winds. Trails will be extremely slippery.`;
        reasonBm = `Risiko tinggi: ${mappedCondition.conditionBm} dan angin kencang. Laluan akan sangat licin.`;
      }
      // 3. Moderate Risk (High Rain Probability, Drizzle)
      else if (rainProb > 75 || weatherCode >= 51) {
        isSafe = true; // Technically safe but advised caution
        severity = 'moderate';
        reason = 'Caution: High probability of rain. Trails may be muddy/slippery. Carry rain gear.';
        reasonBm = 'Perhatian: Kebarangkalian hujan tinggi. Laluan mungkin berlumpur/licin. Bawa baju hujan.';
      }

      return {
        isSafe,
        reason,
        reasonBm,
        severity,
        currentWeather: {
          temp: Math.round(temp),
          condition: mappedCondition.condition,
          conditionBm: mappedCondition.conditionBm,
          windSpeed: Math.round(windSpeed),
          rainProbability: rainProb,
          weatherCode,
        }
      };
    } catch (error) {
      console.error('Error evaluating trail safety:', error);
      return {
        isSafe: true,
        reason: 'Unable to fetch real-time weather. Exercise general caution.',
        reasonBm: 'Gagal mendapatkan data cuaca. Sila berwaspada.',
        severity: 'low',
      };
    }
  }
};
