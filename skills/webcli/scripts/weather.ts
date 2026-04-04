#!/usr/bin/env tsx
/**
 * Weather CLI - 极简天气查询工具
 * Supports: wttr.in (无需 key), OpenWeatherMap (需 API Key)
 *
 * OpenWeatherMap 配置: 通过环境变量 OPENWEATHER_API_KEY 设置
 *   export OPENWEATHER_API_KEY="your-api-key"
 *   或设置 OPENWEATHER_BASE_URL 自定义 base URL
 */

async function wttr(city: string) {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=4&lang=zh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  console.log(text);
}

async function openweather(city: string) {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENWEATHER_API_KEY environment variable");
  }
  const baseUrl =
    process.env.OPENWEATHER_BASE_URL ||
    "https://api.openweathermap.org/data/2.5";
  const url = `${baseUrl}/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json();
  console.log(
    `${data.name}: ${data.weather[0].description}, ${data.main.temp}°C`,
  );
}

// CLI
const [, , action, city] = process.argv;

if (!city) {
  console.log("Usage: npx tsx weather.ts <wttr|open> <city>");
  console.log("Example: npx tsx weather.ts wttr Beijing");
  process.exit(1);
}

if (action === "wttr") {
  wttr(city).catch(console.error);
} else if (action === "open") {
  openweather(city).catch(console.error);
} else {
  console.log("Unknown provider. Use: wttr or open");
}
