import request from 'supertest'
import express from 'express'
import invoicesRouter from '../routes/invoices'

jest.mock('../db')
jest.mock('../services/pdfService')
// routes/invoices.ts mounts requireRole('admin') on POST /. The real
// middleware/auth.ts constructs an Auth0 JWT verifier at import time, which
// throws when AUTH0_DOMAIN/AUTH0_AUDIENCE aren't set — stub it out here since
// AUTH_ENABLED is off by default and requireRole is a no-op in that mode anyway.
jest.mock('../middleware/auth', () => ({
  requireRole: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}))

import { query } from '../db'
import { generateQuotePdf } from '../services/pdfService'

const mockQuery = query as jest.Mock
const mockGenerateQuotePdf = generateQuotePdf as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/invoices', invoicesRouter)

const INVOICE_ROW = {
  id: 'inv-1', job_id: 'job-1', customer_id: 'cust-1',
  c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'james@example.com', c_phone: '0400000000',
  c_street: '14 Kookaburra Cres', c_suburb: 'Doncaster', c_state: 'VIC', c_postcode: '3108', c_nmi: null,
  c_created_at: new Date(),
  invoice_number: 'INV-000001', type: 'deposit', line_items: [{ description: 'Deposit', qty: 1, unitPrice: 500, total: 500 }],
  subtotal: '500.00', gst: '50.00', total: '550.00', due_date: new Date(2026, 9, 1),
  paid_at: null, stripe_payment_link: null, stripe_payment_intent: null,
  status: 'draft', created_at: new Date(),
}

const validBody = {
  jobId: '11111111-1111-1111-1111-111111111111',
  customerId: '22222222-2222-2222-2222-222222222222',
  type: 'deposit',
  lineItems: [{ description: 'Deposit', qty: 1, unitPrice: 500, total: 500 }],
  subtotal: 500, gst: 50, total: 550, dueDate: '2026-10-01',
}

beforeEach(() => {
  mockQuery.mockReset()
  mockGenerateQuotePdf.mockReset()
})

describe('GET /api/invoices', () => {
  it('filters by jobId and status together', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INVOICE_ROW] })
    const res = await request(app).get('/api/invoices').query({ jobId: 'job-1', status: 'draft' })
    expect(res.status).toBe(200)
    const [sql, params] = mockQuery.mock.calls[0]
    expect(sql).toContain('i.job_id = $1')
    expect(sql).toContain('i.status = $2')
    expect(params).toEqual(['job-1', 'draft'])
    expect(res.body[0].total).toBe(550)
  })
})

describe('GET /api/invoices/:id', () => {
  it('returns 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/invoices/missing')
    expect(res.status).toBe(404)
  })
})

describe('GET /api/invoices/:id/pdf', () => {
  it('returns 404 when the invoice does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/invoices/missing/pdf')
    expect(res.status).toBe(404)
  })

  it('streams a generated PDF, treating the full total as balance due (no deposit/rebate)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INVOICE_ROW] })
    mockGenerateQuotePdf.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))

    const res = await request(app).get('/api/invoices/inv-1/pdf')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(mockGenerateQuotePdf).toHaveBeenCalledWith(expect.objectContaining({
      quoteNumber: 'INV-000001', stcRebate: 0, depositAmount: 0, balanceAmount: 550,
    }))
  })

  it('returns 500 when PDF generation throws', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [INVOICE_ROW] })
    mockGenerateQuotePdf.mockRejectedValueOnce(new Error('pdf-lib failure'))
    const res = await request(app).get('/api/invoices/inv-1/pdf')
    expect(res.status).toBe(500)
  })
})

describe('POST /api/invoices', () => {
  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/invoices').send({ type: 'deposit' })
    expect(res.status).toBe(400)
  })

  it('rejects an invalid invoice type', async () => {
    const res = await request(app).post('/api/invoices').send({ ...validBody, type: 'refund' })
    expect(res.status).toBe(400)
  })

  it('creates an invoice with a generated invoice number', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'inv-1' }] })
      .mockResolvedValueOnce({ rows: [INVOICE_ROW] })

    const res = await request(app).post('/api/invoices').send(validBody)

    expect(res.status).toBe(201)
    expect(res.body.invoiceNumber).toBe('INV-000001')
    const insertParams = mockQuery.mock.calls[0][1]
    expect(insertParams[2]).toMatch(/^INV-\d{6}$/)
  })
})
