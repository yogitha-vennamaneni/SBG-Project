import request from 'supertest'
import express from 'express'
import enquiriesRouter from '../routes/enquiries'

jest.mock('../db')
import { query } from '../db'
const mockQuery = query as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/enquiries', enquiriesRouter)

const ENQUIRY_ROW = {
  id: 'enq-1', customer_id: 'cust-1',
  c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'j@x.com', c_phone: '040', c_street: 's',
  c_suburb: 'sub', c_state: 'VIC', c_postcode: '3000', c_nmi: null, c_created_at: new Date(),
  job_type: 'solar_installation', description: 'New system', roof_type: 'tile',
  system_size_kw: '6.6', panel_count: 16, battery_capacity_kwh: null, existing_solar_kw: null,
  ev_charger_amps: null, phase_type: null, roof_area: null,
  weather_risk: null, weather_note: null, status: 'new', created_at: new Date(),
}

const validBody = {
  customerId: '11111111-1111-1111-1111-111111111111',
  jobType: 'solar_installation',
  systemSizeKw: 6.6,
}

beforeEach(() => {
  mockQuery.mockReset()
})

describe('GET /api/enquiries', () => {
  it('returns paginated enquiries', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [ENQUIRY_ROW] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
    const res = await request(app).get('/api/enquiries')
    expect(res.status).toBe(200)
    expect(res.body.data[0].jobType).toBe('solar_installation')
  })

  it('filters by status and jobType together', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
    await request(app).get('/api/enquiries').query({ status: 'new', jobType: 'ev_charger' })
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('e.status = $1')
    expect(sql).toContain('e.job_type = $2')
    expect(params).toEqual(['new', 'ev_charger', 20, 0])
  })
})

describe('GET /api/enquiries/:id', () => {
  it('returns 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/enquiries/missing')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/enquiries', () => {
  it('rejects an invalid jobType', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...validBody, jobType: 'bad_type' })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid evChargerAmps value (not 16 or 32)', async () => {
    const res = await request(app).post('/api/enquiries').send({ ...validBody, jobType: 'ev_charger', evChargerAmps: 20 })
    expect(res.status).toBe(400)
  })

  it('creates an enquiry and reselects the joined row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'enq-1' }] })
      .mockResolvedValueOnce({ rows: [ENQUIRY_ROW] })
    const res = await request(app).post('/api/enquiries').send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('enq-1')
  })
})

describe('PUT /api/enquiries/:id', () => {
  it('returns 404 when the enquiry does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).put('/api/enquiries/missing').send({ description: 'Updated' })
    expect(res.status).toBe(404)
  })

  it('merges a partial update onto the existing row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'enq-1', customer_id: 'cust-1', job_type: 'solar_installation', description: 'Old', roof_type: 'tile', system_size_kw: 6.6, panel_count: 16, battery_capacity_kwh: null, existing_solar_kw: null, ev_charger_amps: null, phase_type: null, roof_area: null, weather_risk: null, weather_note: null }] })
      .mockResolvedValueOnce({ rows: [{ id: 'enq-1' }] })
      .mockResolvedValueOnce({ rows: [{ ...ENQUIRY_ROW, description: 'Updated' }] })

    const res = await request(app).put('/api/enquiries/enq-1').send({ description: 'Updated' })

    expect(res.status).toBe(200)
    expect(res.body.description).toBe('Updated')
    const updateParams = mockQuery.mock.calls[1][1]
    expect(updateParams[2]).toBe('Updated')     // description, overridden
    expect(updateParams[0]).toBe('cust-1')      // customerId, preserved
  })
})
