import React, { useState, useEffect } from 'react';
import { Sun, Cloud, CloudRain, Moon, CloudSun } from 'lucide-react';

export function ClockWeatherWidget() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const hour = time.getHours();
  const isDay = hour >= 6 && hour < 18;
  
  const WeatherIcon = isDay ? Sun : Moon;

  return (
    <div className="flex items-center justify-between bg-[#111113] p-3 border border-white/10 rounded-lg text-xs font-mono text-gray-400 w-full hover:border-white/20 transition-colors">
      <div className="font-bold text-[#E4E4E4]">
        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
      <div className="flex items-center gap-2">
        <WeatherIcon className="w-4 h-4 text-[#F59E0B]" />
        <span>22°C</span>
      </div>
    </div>
  );
}
