import request from 'supertest'
import express from 'express'
import installersRouter from '../routes/installers'

jest.mock('../db')
import { query } from '../db'
const mockQuery = query as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/installers', installersRouter)

const INSTALLER_ROW = {
  id: 'inst-1', first_name: 'Alice', last_name: 'Smith', email: 'alice@sbg.com.au', phone: '0400000001',
  role: 'electrician', licence_number: 'REC1111', rec_registration: null,
  skills: '{solar_installation,battery_installation}', is_active: true,
  installer_code: null, state: null, home_base: null, working_days: null,
  shift_start: null, shift_end: null, leave_start: null, leave_end: null,
}

const validBody = {
  firstName: 'Bob', lastName: 'Jones', email: 'bob@sbg.com.au', phone: '0400000002',
  role: 'installer', skills: ['solar_installation'],
}

beforeEach(() => {
  mockQuery.mockReset()
})

describe('GET /api/installers', () => {
  it('lists installers with availability attached', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [INSTALLER_ROW] })
      .mockResolvedValueOnce({ rows: [{ installer_id: 'inst-1', day_of_week: 1, start_time: '07:00:00', end_time: '17:00:00' }] })

    const res = await request(app).get('/api/installers')

    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].skills).toEqual(['solar_installation', 'battery_installation'])
    expect(res.body[0].availability).toEqual([{ dayOfWeek: 1, startTime: '07:00', endTime: '17:00' }])
  })

  it('filters by skill', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/installers').query({ skill: 'roof_renovation' })
    expect(res.status).toBe(200)
    expect(mockQuery.mock.calls[0][0]).toContain('WHERE $1 = ANY(skills)')
    expect(mockQuery.mock.calls[0][1]).toEqual(['roof_renovation'])
  })
})

describe('GET /api/installers/:id', () => {
  it('returns 404 when the installer is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/installers/missing')
    expect(res.status).toBe(404)
  })

  it('returns the mapped installer', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [INSTALLER_ROW] })
      .mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/installers/inst-1')
    expect(res.status).toBe(200)
    expect(res.body.firstName).toBe('Alice')
  })
})

describe('GET /api/installers/:id/schedule', () => {
  it('maps jobs with the requested installer pinned as assigned', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'job-1', quote_id: null, customer_id: null,
        c_first_name: null, job_type: 'solar_installation', status: 'scheduled',
        scheduled_date: new Date(2026, 8, 15), scheduled_start_time: '08:00:00', estimated_duration: 360,
        street: 's', suburb: 'sub', state: 'VIC', postcode: '3000', notes: null,
        created_at: new Date(), updated_at: new Date(),
      }],
    })
    const res = await request(app).get('/api/installers/inst-1/schedule').query({ from: '2026-09-01', to: '2026-09-30' })
    expect(res.status).toBe(200)
    expect(res.body[0].assignedInstallers).toEqual(['inst-1'])
    expect(mockQuery.mock.calls[0][1]).toEqual(['inst-1', '2026-09-01', '2026-09-30'])
  })
})

describe('POST /api/installers', () => {
  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/installers').send({ firstName: 'Bob' })
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects an invalid email', async () => {
    const res = await request(app).post('/api/installers').send({ ...validBody, email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('rejects a malformed shiftStart time', async () => {
    const res = await request(app).post('/api/installers').send({ ...validBody, shiftStart: '7am' })
    expect(res.status).toBe(400)
  })

  it('creates an installer', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ ...INSTALLER_ROW, id: 'inst-2', first_name: 'Bob', last_name: 'Jones', skills: ['solar_installation'] }] })
    const res = await request(app).post('/api/installers').send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.firstName).toBe('Bob')
  })
})

describe('POST /api/installers/availability-check', () => {
  const body = {
    installerIds: ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'],
    date: '2026-09-14', startTime: '09:00', jobType: 'solar_installation',
  }

  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/installers/availability-check').send({ ...body, date: 'bad-date' })
    expect(res.status).toBe(400)
  })

  it('splits installerIds into available vs conflicts', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: '11111111-1111-1111-1111-111111111111' }] })
    const res = await request(app).post('/api/installers/availability-check').send(body)
    expect(res.status).toBe(200)
    expect(res.body.data.available).toEqual(['11111111-1111-1111-1111-111111111111'])
    expect(res.body.data.conflicts).toEqual(['22222222-2222-2222-2222-222222222222'])
  })
})

describe('PUT /api/installers/:id', () => {
  it('returns 404 when the installer does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).put('/api/installers/missing').send({ firstName: 'New' })
    expect(res.status).toBe(404)
  })

  it('merges partial updates onto the existing row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [INSTALLER_ROW] })     // existing lookup
      .mockResolvedValueOnce({ rows: [{ ...INSTALLER_ROW, first_name: 'Alicia' }] }) // UPDATE ... RETURNING
      .mockResolvedValueOnce({ rows: [] })                    // attachAvailability

    const res = await request(app).put('/api/installers/inst-1').send({ firstName: 'Alicia' })

    expect(res.status).toBe(200)
    expect(res.body.firstName).toBe('Alicia')
    const updateParams = mockQuery.mock.calls[1][1]
    expect(updateParams[0]).toBe('Alicia')      // overridden
    expect(updateParams[1]).toBe('Smith')       // preserved from existing row
  })
})
