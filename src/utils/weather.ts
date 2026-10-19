/**
 * Thời tiết THẬT từ Open-Meteo (miễn phí, không cần API key) — port từ web
 * src/utils/weatherUtils.js để cả web & mobile hiển thị cùng 1 nguồn sự thật.
 * BỎ hoàn toàn ước lượng theo tên thành phố: không GPS thì không hiện
 * (không bịa số liệu).
 */

const weatherCache = new Map<string, { data: LiveWeather; timestamp: number }>();

export interface LiveWeather {
  temp: number;
  humidity: number;
  windSpeed: number;
  label: string;
  icon: string;
  vibe: string;
}

/** Ánh xạ mã thời tiết WMO — Европейность đồng bộ web. */
export const parseWeatherCode = (code: number): { label: string; icon: string; vibe: string } => {
  if (code === 0) return { label: 'Trời quang, nắng đẹp', icon: '☀️', vibe: 'Rất lý tưởng chụp ảnh & ngắm cảnh' };
  if (code === 1 || code === 2) return { label: 'Nắng nhẹ, có mây', icon: '🌤️', vibe: 'Thời tiết mát mẻ, dễ chịu' };
  if (code === 3) return { label: 'Mây rải rác', icon: '⛅', vibe: 'Thích hợp dạo bộ & dã ngoại' };
  if (code === 45 || code === 48) return { label: 'Sương mù lãng đãng', icon: '🌫️', vibe: 'Khung giờ vàng săn mây' };
  if ([51, 53, 55, 61].includes(code)) return { label: 'Mưa phùn nhỏ', icon: '🌦️', vibe: 'Nên mang theo ô nhỏ' };
  if ([63, 65, 80, 81, 82].includes(code)) return { label: 'Mưa rào', icon: '🌧️', vibe: 'Nên ghé quán cafe trú mưa' };
  if ([95, 96, 99].includes(code)) return { label: 'Dông sét', icon: '⛈️', vibe: 'Hạn chế hoạt động ngoài trời' };
  return { label: 'Thời tiết êm dịu', icon: '🌤️', vibe: 'Phù hợp du lịch' };
};

export const fetchLiveWeather = async (lat?: number | null, lng?: number | null): Promise<LiveWeather | null> => {
  if (!lat || !lng) return null;
  const key = `${Number(lat).toFixed(2)},${Number(lng).toFixed(2)}`;

  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.timestamp < 15 * 60 * 1000) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const cur = data?.current;
    if (!cur) return null;

    const parsed = parseWeatherCode(cur.weather_code);
    const result: LiveWeather = {
      temp: Math.round(cur.temperature_2m),
      humidity: cur.relative_humidity_2m,
      windSpeed: Math.round(cur.wind_speed_10m),
      label: parsed.label,
      icon: parsed.icon,
      vibe: parsed.vibe,
    };
    weatherCache.set(key, { data: result, timestamp: Date.now() });
    return result;
  } catch (e) {
    console.warn('Could not fetch Open-Meteo weather', e);
    return null;
  }
};
