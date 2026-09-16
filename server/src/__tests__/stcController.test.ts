import request from 'supertest'
import express from 'express'
import stcRouter from '../routes/stc'

const app = express()
app.use(express.json())
app.use('/api/stc', stcRouter)

describe('POST /api/stc/calculate', () => {
  it('rejects a non-positive systemKw', async () => {
    const res = await request(app).post('/api/stc/calculate').send({ systemKw: 0, postcode: '3128' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation error')
  })

  it('rejects a postcode that is not 4 digits', async () => {
    const res = await request(app).post('/api/stc/calculate').send({ systemKw: 6.6, postcode: '312' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when the service throws (system size over 100kW)', async () => {
    const res = await request(app).post('/api/stc/calculate').send({ systemKw: 150, postcode: '3128' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('100 kW')
  })

  it('returns the calculation wrapped in a data envelope', async () => {
    const res = await request(app).post('/api/stc/calculate').send({ systemKw: 6.6, postcode: '3128' })
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ systemSizeKw: 6.6, zone: 3, unitPriceAud: 38 })
    expect(res.body.data.stcCount).toBeGreaterThan(0)
  })

  it('honours a custom unitPriceAud', async () => {
    const res = await request(app).post('/api/stc/calculate').send({ systemKw: 6.6, postcode: '3128', unitPriceAud: 42 })
    expect(res.status).toBe(200)
    expect(res.body.data.unitPriceAud).toBe(42)
    expect(res.body.data.totalRebateAud).toBe(res.body.data.stcCount * 42)
  })
})
