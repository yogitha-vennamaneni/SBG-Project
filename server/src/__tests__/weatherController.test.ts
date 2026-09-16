import request from 'supertest'
import express from 'express'
import weatherRouter from '../routes/weather'

jest.mock('../services/weatherService')
import { getWeatherForecast } from '../services/weatherService'
const mockGetWeatherForecast = getWeatherForecast as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/weather', weatherRouter)

beforeEach(() => {
  mockGetWeatherForecast.mockReset()
})

describe('GET /api/weather/:postcode', () => {
  it('rejects a non-4-digit postcode', async () => {
    const res = await request(app).get('/api/weather/abc')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Postcode must be 4 digits')
    expect(mockGetWeatherForecast).not.toHaveBeenCalled()
  })

  it('defaults suburb to Melbourne when not provided', async () => {
    mockGetWeatherForecast.mockResolvedValueOnce([])
    const res = await request(app).get('/api/weather/3128')
    expect(res.status).toBe(200)
    expect(mockGetWeatherForecast).toHaveBeenCalledWith('Melbourne', '3128')
  })

  it('passes the suburb query param through', async () => {
    mockGetWeatherForecast.mockResolvedValueOnce([])
    await request(app).get('/api/weather/3128').query({ suburb: 'Box Hill' })
    expect(mockGetWeatherForecast).toHaveBeenCalledWith('Box Hill', '3128')
  })

  it('wraps the forecast in a data envelope', async () => {
    const forecast = [{ date: '2026-09-15', tempMaxC: 22, windSpeedKmh: 15, rainChancePct: 10, condition: 'clear', risk: 'low', advisories: [] }]
    mockGetWeatherForecast.mockResolvedValueOnce(forecast)
    const res = await request(app).get('/api/weather/3128')
    expect(res.status).toBe(200)
    expect(res.body.data).toEqual(forecast)
  })

  it('returns 500 with the error message when the service throws', async () => {
    mockGetWeatherForecast.mockRejectedValueOnce(new Error('OpenWeatherMap error: 500'))
    const res = await request(app).get('/api/weather/3128')
    expect(res.status).toBe(500)
    expect(res.body.error).toBe('OpenWeatherMap error: 500')
  })
})
