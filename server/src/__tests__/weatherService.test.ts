import { getWeatherForecast } from '../services/weatherService'

describe('Weather service — mock mode (no API key)', () => {
  beforeEach(() => {
    delete process.env.OPENWEATHER_API_KEY
  })

  it('returns 5 days of forecast data', async () => {
    const forecast = await getWeatherForecast('Box Hill', '3128')
    expect(forecast).toHaveLength(5)
  })

  it('each day has required fields', async () => {
    const forecast = await getWeatherForecast('Doncaster', '3108')
    for (const day of forecast) {
      expect(day).toHaveProperty('date')
      expect(day).toHaveProperty('tempMaxC')
      expect(day).toHaveProperty('windSpeedKmh')
      expect(day).toHaveProperty('rainChancePct')
      expect(day).toHaveProperty('condition')
      expect(day).toHaveProperty('risk')
      expect(day).toHaveProperty('advisories')
      expect(['low', 'medium', 'high']).toContain(day.risk)
    }
  })

  it('dates are in ISO format (YYYY-MM-DD)', async () => {
    const forecast = await getWeatherForecast('Melbourne', '3000')
    for (const day of forecast) {
      expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('days are in chronological order', async () => {
    const forecast = await getWeatherForecast('Melbourne', '3000')
    for (let i = 1; i < forecast.length; i++) {
      expect(new Date(forecast[i].date).getTime())
        .toBeGreaterThan(new Date(forecast[i - 1].date).getTime())
    }
  })

  it('assigns high risk when wind exceeds 40km/h', async () => {
    // Day index 2 in mock data has wind 47km/h → high risk
    const forecast = await getWeatherForecast('Darwin', '0800')
    const highRiskDay = forecast.find(d => d.windSpeedKmh > 40)
    if (highRiskDay) {
      expect(highRiskDay.risk).toBe('high')
      expect(highRiskDay.advisories.some((a: string) => a.includes('wind'))).toBe(true)
    }
  })

  it('advisory array is empty for low-risk days', async () => {
    const forecast = await getWeatherForecast('Melbourne', '3000')
    const lowRisk = forecast.filter(d => d.risk === 'low')
    lowRisk.forEach(d => expect(d.advisories).toHaveLength(0))
  })

  it('advisories is an array', async () => {
    const forecast = await getWeatherForecast('Sydney', '2000')
    forecast.forEach(d => expect(Array.isArray(d.advisories)).toBe(true))
  })
})
