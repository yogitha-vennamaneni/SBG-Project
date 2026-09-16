import request from 'supertest'
import express from 'express'
import customersRouter from '../routes/customers'

jest.mock('../db')
import { query } from '../db'
const mockQuery = query as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/customers', customersRouter)

const CUSTOMER_ROW = {
  id: 'cust-1', first_name: 'James', last_name: 'Nguyen', email: 'james@example.com', phone: '0400000000',
  street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108', nmi: null,
  created_at: new Date('2026-01-01'),
}

const validBody = {
  firstName: 'James', lastName: 'Nguyen', email: 'james@example.com', phone: '0400000000',
  street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108',
}

beforeEach(() => {
  mockQuery.mockReset()
})

describe('GET /api/customers', () => {
  it('returns paginated customers', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [CUSTOMER_ROW] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
    const res = await request(app).get('/api/customers')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.data[0].firstName).toBe('James')
  })

  it('lowercases and wraps the search term for a case-insensitive LIKE match', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
    const res = await request(app).get('/api/customers').query({ search: 'Nguyen' })
    expect(res.status).toBe(200)
    expect(mockQuery.mock.calls[0][1][0]).toBe('%nguyen%')
  })
})

describe('GET /api/customers/:id', () => {
  it('returns 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/customers/missing')
    expect(res.status).toBe(404)
  })

  it('returns the mapped customer', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CUSTOMER_ROW] })
    const res = await request(app).get('/api/customers/cust-1')
    expect(res.status).toBe(200)
    expect(res.body.address.suburb).toBe('Doncaster')
  })
})

describe('GET /api/customers/:id/jobs', () => {
  it('maps job rows joined with the customer', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{
        id: 'job-1', quote_id: null, customer_id: 'cust-1',
        c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'james@example.com', c_phone: '0400000000',
        c_street: 's', c_suburb: 'sub', c_state: 'VIC', c_postcode: '3000', c_nmi: null, c_created_at: new Date(),
        job_type: 'solar_installation', status: 'enquiry', scheduled_date: null, scheduled_start_time: null,
        estimated_duration: 360, street: 's', suburb: 'sub', state: 'VIC', postcode: '3000', notes: null,
        created_at: new Date(), updated_at: new Date(),
      }],
    })
    const res = await request(app).get('/api/customers/cust-1/jobs')
    expect(res.status).toBe(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].customer.firstName).toBe('James')
  })
})

describe('POST /api/customers', () => {
  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/customers').send({ firstName: 'James' })
    expect(res.status).toBe(400)
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects a postcode that is not 4 characters', async () => {
    const res = await request(app).post('/api/customers').send({ ...validBody, postcode: '31080' })
    expect(res.status).toBe(400)
  })

  it('creates a customer', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CUSTOMER_ROW] })
    const res = await request(app).post('/api/customers').send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.firstName).toBe('James')
  })
})

describe('PUT /api/customers/:id', () => {
  it('returns 404 when the customer does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).put('/api/customers/missing').send({ firstName: 'New' })
    expect(res.status).toBe(404)
  })

  it('merges a partial update onto the existing row', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [CUSTOMER_ROW] })
      .mockResolvedValueOnce({ rows: [{ ...CUSTOMER_ROW, first_name: 'Jimmy' }] })

    const res = await request(app).put('/api/customers/cust-1').send({ firstName: 'Jimmy' })

    expect(res.status).toBe(200)
    expect(res.body.firstName).toBe('Jimmy')
    const updateParams = mockQuery.mock.calls[1][1]
    expect(updateParams[0]).toBe('Jimmy')     // overridden
    expect(updateParams[1]).toBe('Nguyen')    // preserved
  })
})
