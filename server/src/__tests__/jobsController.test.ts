import request from 'supertest'
import express from 'express'
import jobsRouter from '../routes/jobs'

jest.mock('../db')
import { query } from '../db'
const mockQuery = query as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/jobs', jobsRouter)

const JOB_ROW = {
  id: 'job-1', quote_id: null, customer_id: 'cust-1',
  c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'james@example.com', c_phone: '0400000000',
  c_street: '14 Kookaburra Cres', c_suburb: 'Doncaster', c_state: 'VIC', c_postcode: '3108', c_nmi: null,
  c_created_at: new Date('2026-01-01'),
  job_type: 'solar_installation', status: 'enquiry',
  scheduled_date: null, scheduled_start_time: null, estimated_duration: 360,
  street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108', nmi: null,
  notes: null, system_size_kw: '6.6', panel_count: 16,
  created_at: new Date('2026-01-01'), updated_at: new Date('2026-01-01'),
}

beforeEach(() => {
  mockQuery.mockReset()
})

describe('GET /api/jobs', () => {
  it('returns paginated jobs with installers attached', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [JOB_ROW] })       // list query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count query
      .mockResolvedValueOnce({ rows: [] })                // attachAssignedInstallers lookup

    const res = await request(app).get('/api/jobs')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.data).toHaveLength(1)
    expect(res.body.data[0].id).toBe('job-1')
  })

  it('filters by status, date and installerId, parameterizing the WHERE clause', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })

    const res = await request(app).get('/api/jobs').query({
      status: 'scheduled', date: '2026-09-15', installerId: 'inst-1',
    })

    expect(res.status).toBe(200)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('j.status = $1')
    expect(sql).toContain('j.scheduled_date = $2')
    expect(params).toEqual(['scheduled', '2026-09-15', 'inst-1', 100, 0])
  })
})

describe('GET /api/jobs/:id', () => {
  it('returns 404 when the job is missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/jobs/missing')
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('Job not found')
  })

  it('attaches the full installer list to the job', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [JOB_ROW] })
      .mockResolvedValueOnce({ rows: [{ id: 'inst-1', first_name: 'Alice', last_name: 'Smith', email: 'a@sbg.com.au', phone: '040', role: 'electrician', skills: '{}', is_active: true }] })

    const res = await request(app).get('/api/jobs/job-1')

    expect(res.status).toBe(200)
    expect(res.body.installers).toHaveLength(1)
    expect(res.body.installers[0].firstName).toBe('Alice')
    expect(res.body.assignedInstallers).toEqual(['inst-1'])
  })
})

describe('GET /api/jobs/:id/history', () => {
  it('maps status history rows', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'h1', job_id: 'job-1', status: 'enquiry', note: 'Job created', updated_by: 'admin', created_at: new Date('2026-01-01T00:00:00Z') }],
    })
    const res = await request(app).get('/api/jobs/job-1/history')
    expect(res.status).toBe(200)
    expect(res.body).toEqual([{
      id: 'h1', jobId: 'job-1', status: 'enquiry', note: 'Job created', updatedBy: 'admin',
      createdAt: '2026-01-01T00:00:00.000Z',
    }])
  })
})

describe('POST /api/jobs', () => {
  const validBody = {
    customerId: '11111111-1111-1111-1111-111111111111',
    jobType: 'solar_installation',
    street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108',
  }

  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/jobs').send({ jobType: 'not_a_type' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation error')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects a state that is not 3 characters', async () => {
    const res = await request(app).post('/api/jobs').send({ ...validBody, state: 'VICTORIA' })
    expect(res.status).toBe(400)
  })

  it('creates a job and records the initial status history entry', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }] })   // INSERT jobs
      .mockResolvedValueOnce({ rows: [] })                   // INSERT job_status_history
      .mockResolvedValueOnce({ rows: [{ ...JOB_ROW, status: 'enquiry' }] }) // reselect
      .mockResolvedValueOnce({ rows: [] })                   // attach lookup

    const res = await request(app).post('/api/jobs').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.status).toBe('enquiry')
    expect(mockQuery.mock.calls[1][0]).toContain('job_status_history')
    expect(mockQuery.mock.calls[1][0]).toContain("'enquiry'")
    expect(mockQuery.mock.calls[1][1]).toEqual(['job-1'])
  })

  it('defaults estimatedDuration to 240 minutes via COALESCE when omitted', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [JOB_ROW] })
      .mockResolvedValueOnce({ rows: [] })

    await request(app).post('/api/jobs').send(validBody)

    const [insertSql, insertParams] = mockQuery.mock.calls[0]
    expect(insertSql).toContain('COALESCE($9, 240)')
    expect(insertParams[8]).toBeNull() // estimatedDuration param, unset
  })
})

describe('PATCH /api/jobs/:id/status', () => {
  it('rejects an invalid status', async () => {
    const res = await request(app).patch('/api/jobs/job-1/status').send({ status: 'not_a_status' })
    expect(res.status).toBe(400)
  })

  it('returns 404 when the job does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).patch('/api/jobs/missing/status').send({ status: 'completed' })
    expect(res.status).toBe(404)
  })

  it('updates status and appends a history entry', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-1' }] })   // UPDATE jobs
      .mockResolvedValueOnce({ rows: [] })                   // INSERT job_status_history
      .mockResolvedValueOnce({ rows: [{ ...JOB_ROW, status: 'completed' }] }) // reselect
      .mockResolvedValueOnce({ rows: [] })                   // attach lookup

    const res = await request(app).patch('/api/jobs/job-1/status').send({ status: 'completed', note: 'All done' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('completed')
    expect(mockQuery.mock.calls[1][1]).toEqual(['job-1', 'completed', 'All done'])
  })
})
