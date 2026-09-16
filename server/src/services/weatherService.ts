/**
 * Weather service: fetches a 5-day daily forecast from OpenWeatherMap's
 * One Call API 3.0 (timeline-based — lat/lon in, a rolling daily timeline out)
 * and assesses risk for outdoor work (solar/roof installs).
 */

const GEO_BASE = 'https://api.openweathermap.org/geo/1.0'
const ONECALL_BASE = 'https://api.openweathermap.org/data/3.0/onecall'
const API_KEY = process.env.OPENWEATHER_API_KEY

export interface DayForecast {
  date: string
  tempMaxC: number
  windSpeedKmh: number
  rainChancePct: number
  condition: string
  risk: 'low' | 'medium' | 'high'
  advisories: string[]
}

function assessRisk(wind: number, rain: number, temp: number): { risk: DayForecast['risk'], advisories: string[] } {
  const advisories: string[] = []
  let riskScore = 0

  if (wind > 40) { advisories.push(`High winds (${wind.toFixed(0)} km/h) — suspend roof work`); riskScore += 3 }
  else if (wind > 25) { advisories.push(`Moderate winds (${wind.toFixed(0)} km/h) — take care on roof`); riskScore += 1 }

  if (rain > 70) { advisories.push(`High rain probability (${rain}%) — consider reschedule`); riskScore += 2 }
  else if (rain > 40) { advisories.push(`Moderate rain chance (${rain}%)`); riskScore += 1 }

  if (temp > 38) { advisories.push(`Extreme heat (${temp}°C) — mandatory breaks, hydration`); riskScore += 2 }
  else if (temp > 34) { advisories.push(`High heat (${temp}°C) — schedule early morning work`); riskScore += 1 }

  const risk: DayForecast['risk'] = riskScore >= 3 ? 'high' : riskScore >= 1 ? 'medium' : 'low'
  return { risk, advisories }
}

async function geocodePostcode(postcode: string): Promise<{ lat: number, lon: number }> {
  const url = `${GEO_BASE}/zip?zip=${encodeURIComponent(postcode)},AU&appid=${API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenWeatherMap geocoding error: ${res.status}`)
  const data = await res.json() as any
  if (typeof data.lat !== 'number' || typeof data.lon !== 'number') {
    throw new Error(`Could not resolve coordinates for postcode ${postcode}`)
  }
  return { lat: data.lat, lon: data.lon }
}

export async function getWeatherForecast(suburb: string, postcode: string): Promise<DayForecast[]> {
  
  debugger;
  
  if (!API_KEY) {
    // Return mock data in development
    return getMockForecast()
  }

  const { lat, lon } = await geocodePostcode(postcode)
  const url = `${ONECALL_BASE}?lat=${lat}&lon=${lon}&units=metric&exclude=current,minutely,hourly,alerts&appid=${API_KEY}`
  const res = await fetch(url)
  console.log("res", res)
  if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`)
  const data = await res.json() as any

  return (data.daily as any[]).slice(0, 5).map((day) => {
    const date = new Date(day.dt * 1000).toISOString().slice(0, 10)
    const tempMax = day.temp.max
    const windMax = day.wind_speed * 3.6  // m/s → km/h
    const rainChance = Math.round((day.pop ?? 0) * 100)
    const condition = day.weather?.[0]?.description ?? 'unknown'
    const { risk, advisories } = assessRisk(windMax, rainChance, tempMax)

    return { date, tempMaxC: Math.round(tempMax), windSpeedKmh: Math.round(windMax), rainChancePct: rainChance, condition, risk, advisories }
  })
}

function getMockForecast(): DayForecast[] {
  const today = new Date()
  return Array.from({ length: 5 }, (_, i) => {
    const date = new Date(today)
    date.setDate(today.getDate() + i)
    const dateStr = date.toISOString().slice(0, 10)
    const wind = i === 2 ? 47 : 15 + i * 3
    const rain = i === 3 ? 75 : 10 + i * 5
    const temp = 22 + i * 2
    const { risk, advisories } = assessRisk(wind, rain, temp)
    return {
      date: dateStr,
      tempMaxC: temp,
      windSpeedKmh: wind,
      rainChancePct: rain,
      condition: i === 2 ? 'windy' : i === 3 ? 'light rain' : 'partly cloudy',
      risk, advisories,
    }
  })
}
