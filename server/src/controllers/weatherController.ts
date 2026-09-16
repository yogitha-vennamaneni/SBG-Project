import { Request, Response } from 'express'
import { getWeatherForecast } from '../services/weatherService'

/**
 * GET /api/weather/:postcode?suburb=Box+Hill
 */
export async function getForecast(req: Request, res: Response) {
  const { postcode } = req.params
  const suburb = (req.query.suburb as string) || 'Melbourne'

  if (!/^\d{4}$/.test(postcode)) {
    return res.status(400).json({ error: 'Postcode must be 4 digits' })
  }

  try {
    const forecast = await getWeatherForecast(suburb, postcode)
    res.json({ data: forecast })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch weather'
    res.status(500).json({ error: message })
  }
}
