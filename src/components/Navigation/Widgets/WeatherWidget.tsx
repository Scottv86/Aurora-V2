import { useState, useEffect, useRef } from 'react';
import { 
  Sun, 
  CloudSun, 
  Cloud, 
  CloudRain, 
  CloudLightning, 
  Snowflake, 
  CloudFog, 
  CloudDrizzle,
  RefreshCw,
  MapPin,
  Wind,
  Droplets,
  Thermometer,
  Navigation as NavigationIcon,
  SlidersHorizontal
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { WidgetCommonProps } from './types';

interface WeatherData {
  city: string;
  country?: string;
  tempC: number;
  apparentTempC: number;
  humidity: number;
  windSpeedKmH: number;
  weatherCode: number;
  isDay: boolean;
  tempMaxC?: number;
  tempMinC?: number;
  updatedAt: number;
  isGps?: boolean;
}

const CACHE_KEY = 'aurora_weather_cache_v2';
const UNIT_KEY = 'aurora_weather_unit';
const CACHE_TTL_MS = 20 * 60 * 1000;

export function getWeatherDetails(code: number, isDay: boolean = true) {
  switch (code) {
    case 0:
      return { label: isDay ? 'Sunny' : 'Clear', icon: 'sun', color: 'from-amber-400 to-amber-500' };
    case 1:
      return { label: isDay ? 'Mainly Sunny' : 'Mainly Clear', icon: 'sun', color: 'from-amber-400 to-yellow-500' };
    case 2:
      return { label: 'Partly Cloudy', icon: 'cloud-sun', color: 'from-amber-300 to-sky-400' };
    case 3:
      return { label: 'Overcast', icon: 'cloud', color: 'from-zinc-400 to-zinc-500' };
    case 45:
    case 48:
      return { label: 'Foggy', icon: 'fog', color: 'from-zinc-300 to-slate-400' };
    case 51:
    case 53:
    case 55:
      return { label: 'Drizzle', icon: 'drizzle', color: 'from-sky-300 to-blue-400' };
    case 56:
    case 57:
      return { label: 'Freezing Drizzle', icon: 'drizzle', color: 'from-cyan-300 to-blue-500' };
    case 61:
    case 63:
    case 65:
      return { label: 'Rain', icon: 'rain', color: 'from-blue-400 to-indigo-500' };
    case 66:
    case 67:
      return { label: 'Freezing Rain', icon: 'rain', color: 'from-cyan-400 to-indigo-600' };
    case 71:
    case 73:
    case 75:
    case 77:
      return { label: 'Snow', icon: 'snow', color: 'from-sky-200 to-blue-300' };
    case 80:
    case 81:
    case 82:
      return { label: 'Showers', icon: 'rain', color: 'from-blue-400 to-sky-500' };
    case 85:
    case 86:
      return { label: 'Snow Showers', icon: 'snow', color: 'from-sky-100 to-blue-400' };
    case 95:
    case 96:
    case 99:
      return { label: 'Thunderstorm', icon: 'thunder', color: 'from-purple-500 to-amber-500' };
    default:
      return { label: 'Clear', icon: 'sun', color: 'from-amber-400 to-amber-500' };
  }
}

export const WeatherWidget: React.FC<WidgetCommonProps> = ({ onOpenCustomize, isCompact }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [unit, setUnit] = useState<'C' | 'F'>(() => {
    return (localStorage.getItem(UNIT_KEY) as 'C' | 'F') || 'C';
  });
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed: WeatherData = JSON.parse(cached);
        if (Date.now() - parsed.updatedAt < CACHE_TTL_MS) {
          setWeather(parsed);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('Weather cache parse error:', e);
    }
    fetchWeather();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleUnit = () => {
    const nextUnit = unit === 'C' ? 'F' : 'C';
    setUnit(nextUnit);
    localStorage.setItem(UNIT_KEY, nextUnit);
  };

  const toDisplayTemp = (tempC: number) => {
    if (unit === 'F') {
      return Math.round((tempC * 9) / 5 + 32);
    }
    return Math.round(tempC);
  };

  const fetchWeather = async (forceGps: boolean = false) => {
    setRefreshing(true);
    try {
      let lat = -34.9285;
      let lon = 138.6007;
      let city = 'Adelaide';
      let isGps = false;

      if (forceGps && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 8000 });
          });
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
          isGps = true;
          city = 'Current Location';
        } catch (err) {
          console.warn('Geolocation failed, falling back to IP geo:', err);
        }
      }

      if (!isGps) {
        try {
          const geoRes = await fetch('https://get.geojs.io/v1/ip/geo.json');
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            if (geoData.latitude && geoData.longitude) {
              lat = parseFloat(geoData.latitude);
              lon = parseFloat(geoData.longitude);
              city = geoData.city || city;
            }
          }
        } catch (err) {
          console.warn('IP geo lookup fallback error:', err);
        }
      }

      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
      const wRes = await fetch(weatherUrl);
      if (!wRes.ok) throw new Error('Weather API error');

      const data = await wRes.json();
      const current = data.current;
      const daily = data.daily;

      const newWeatherData: WeatherData = {
        city,
        tempC: current.temperature_2m,
        apparentTempC: current.apparent_temperature,
        humidity: current.relative_humidity_2m,
        windSpeedKmH: current.wind_speed_10m,
        weatherCode: current.weather_code,
        isDay: current.is_day === 1,
        tempMaxC: daily?.temperature_2m_max?.[0],
        tempMinC: daily?.temperature_2m_min?.[0],
        updatedAt: Date.now(),
        isGps
      };

      setWeather(newWeatherData);
      localStorage.setItem(CACHE_KEY, JSON.stringify(newWeatherData));
    } catch (err) {
      console.error('Failed to fetch weather:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading && !weather) {
    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded-lg animate-pulse opacity-60">
        <div className="w-3.5 h-3.5 rounded-full bg-amber-400/50" />
        <div className="flex flex-col gap-0.5">
          <div className="w-6 h-2.5 bg-zinc-300 dark:bg-zinc-700 rounded" />
          <div className="w-9 h-2 bg-zinc-200 dark:bg-zinc-800 rounded" />
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const details = getWeatherDetails(weather.weatherCode, weather.isDay);

  const renderWeatherIcon = () => {
    if (details.icon === 'sun') {
      return (
        <div className="relative flex items-center justify-center shrink-0">
          <div className="w-3.5 h-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
        </div>
      );
    }
    if (details.icon === 'cloud-sun') return <CloudSun size={15} className="text-amber-400 shrink-0" />;
    if (details.icon === 'cloud') return <Cloud size={15} className="text-zinc-400 shrink-0" />;
    if (details.icon === 'rain') return <CloudRain size={15} className="text-blue-400 shrink-0" />;
    if (details.icon === 'drizzle') return <CloudDrizzle size={15} className="text-sky-400 shrink-0" />;
    if (details.icon === 'snow') return <Snowflake size={15} className="text-sky-300 shrink-0" />;
    if (details.icon === 'thunder') return <CloudLightning size={15} className="text-amber-400 shrink-0" />;
    if (details.icon === 'fog') return <CloudFog size={15} className="text-slate-400 shrink-0" />;
    return <Sun size={15} className="text-amber-400 shrink-0" />;
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 px-2 py-1 rounded-lg transition-all text-left group select-none cursor-pointer",
          "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
          isOpen && "bg-zinc-100 dark:bg-zinc-800"
        )}
        title={`${details.label}, ${toDisplayTemp(weather.tempC)}°${unit} in ${weather.city}. Click for details.`}
      >
        {renderWeatherIcon()}
        <div className="flex flex-col leading-none">
          <span className="text-[12px] font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {toDisplayTemp(weather.tempC)}°{unit}
          </span>
          {!isCompact && (
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-normal mt-0.5 tracking-tight whitespace-nowrap">
              {details.label}
            </span>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl shadow-black/15 dark:shadow-black/50 overflow-hidden z-[65] animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3.5 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 min-w-0">
                <MapPin size={13} className="text-indigo-500 shrink-0" />
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                  {weather.city}
                </span>
                {weather.isGps && (
                  <span className="text-[9px] font-semibold bg-indigo-500/10 text-indigo-500 px-1 rounded uppercase tracking-wider">
                    GPS
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={toggleUnit}
                  className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                  title="Toggle °C / °F"
                >
                  °{unit}
                </button>
                <button
                  type="button"
                  onClick={() => fetchWeather(weather.isGps)}
                  disabled={refreshing}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                  title="Refresh weather data"
                >
                  <RefreshCw size={12} className={cn(refreshing && "animate-spin text-indigo-500")} />
                </button>
                {onOpenCustomize && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenCustomize();
                    }}
                    className="p-1 rounded text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors ml-0.5"
                    title="Customize widgets"
                  >
                    <SlidersHorizontal size={12} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/50 dark:border-zinc-700/50">
                  {renderWeatherIcon()}
                </div>
                <div>
                  <div className="text-xl font-bold text-zinc-900 dark:text-white leading-none">
                    {toDisplayTemp(weather.tempC)}°{unit}
                  </div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-medium mt-1">
                    {details.label}
                  </div>
                </div>
              </div>

              {weather.tempMaxC !== undefined && weather.tempMinC !== undefined && (
                <div className="text-right text-[11px] font-medium text-zinc-500 dark:text-zinc-400 space-y-0.5">
                  <div>H: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{toDisplayTemp(weather.tempMaxC)}°</span></div>
                  <div>L: <span className="text-zinc-800 dark:text-zinc-200 font-semibold">{toDisplayTemp(weather.tempMinC)}°</span></div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800 text-center py-2.5 bg-zinc-50/20 dark:bg-zinc-950/20 text-[11px]">
            <div className="px-2">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                <Thermometer size={11} />
                <span className="text-[10px] font-medium">Feels</span>
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {toDisplayTemp(weather.apparentTempC)}°
              </span>
            </div>
            <div className="px-2">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                <Droplets size={11} />
                <span className="text-[10px] font-medium">Humidity</span>
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {weather.humidity}%
              </span>
            </div>
            <div className="px-2">
              <div className="flex items-center justify-center gap-1 text-zinc-400 mb-0.5">
                <Wind size={11} />
                <span className="text-[10px] font-medium">Wind</span>
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                {Math.round(weather.windSpeedKmH)} km/h
              </span>
            </div>
          </div>

          <div className="p-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
            <button
              type="button"
              onClick={() => fetchWeather(true)}
              className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 px-2 py-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors w-full justify-center"
            >
              <NavigationIcon size={11} />
              <span>Use precise GPS location</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
