// TEMPLATE_ID_BY_JOB_TYPE in quotesController.ts is built from process.env at
// *module load* time, so the env var must be set before the router is imported.
process.env.DOCUSEAL_SOLAR_TEMPLATE_ID = 'tmpl-123'

import request from 'supertest'
import express from 'express'
import quotesRouter from '../routes/quotes'

jest.mock('../db')
jest.mock('../services/pdfService')
jest.mock('../services/docusealService')

import { query } from '../db'
import { generateQuotePdf } from '../services/pdfService'
import { createSignatureRequest } from '../services/docusealService'

const mockQuery = query as jest.Mock
const mockGenerateQuotePdf = generateQuotePdf as jest.Mock
const mockCreateSignatureRequest = createSignatureRequest as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/quotes', quotesRouter)

const QUOTE_ROW = {
  id: 'quote-1', enquiry_id: null, customer_id: 'cust-1',
  c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'james@example.com', c_phone: '0400000000',
  c_street: '14 Kookaburra Cres', c_suburb: 'Doncaster', c_state: 'VIC', c_postcode: '3108', c_nmi: null,
  c_created_at: new Date(),
  job_type: 'solar_installation', line_items: [{ description: 'Panels', qty: 1, unitPrice: 100, total: 100 }],
  subtotal: '100.00', stc_rebate: '38.00', gst: '10.00', total: '72.00',
  deposit_amount: '14.40', balance_amount: '57.60', valid_until: new Date(2026, 9, 1),
  docsign_status: 'draft', docsign_envelope_id: null, signed_at: null, created_at: new Date(),
}

const validBody = {
  customerId: '11111111-1111-1111-1111-111111111111',
  jobType: 'solar_installation',
  lineItems: [{ description: 'Panels', qty: 1, unitPrice: 100, total: 100 }],
  subtotal: 100, gst: 10, total: 72, depositAmount: 14.4, balanceAmount: 57.6, validUntil: '2026-10-01',
}

beforeEach(() => {
  mockQuery.mockReset()
  mockGenerateQuotePdf.mockReset()
  mockCreateSignatureRequest.mockReset()
})

describe('GET /api/quotes', () => {
  it('filters by docsign status', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [QUOTE_ROW] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
    const res = await request(app).get('/api/quotes').query({ status: 'sent' })
    expect(res.status).toBe(200)
    expect(mockQuery.mock.calls[0][0]).toContain('q.docsign_status = $1')
    expect(res.body.data[0].subtotal).toBe(100)
  })
})

describe('GET /api/quotes/:id', () => {
  it('returns 404 when missing', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/quotes/missing')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/quotes', () => {
  it('rejects an invalid body', async () => {
    const res = await request(app).post('/api/quotes').send({ jobType: 'solar_installation' })
    expect(res.status).toBe(400)
  })

  it('defaults stcRebate to 0 when omitted', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1' }] })
      .mockResolvedValueOnce({ rows: [QUOTE_ROW] })
    await request(app).post('/api/quotes').send(validBody)
    const insertParams = mockQuery.mock.calls[0][1]
    expect(insertParams[5]).toBe(0) // stcRebate
  })

  it('creates a quote', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'quote-1' }] })
      .mockResolvedValueOnce({ rows: [QUOTE_ROW] })
    const res = await request(app).post('/api/quotes').send(validBody)
    expect(res.status).toBe(201)
    expect(res.body.id).toBe('quote-1')
  })
})

describe('PUT /api/quotes/:id', () => {
  it('returns 404 when the quote does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).put('/api/quotes/missing').send({ subtotal: 200 })
    expect(res.status).toBe(404)
  })
})

describe('GET /api/quotes/:id/pdf', () => {
  it('returns 404 when the quote does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).get('/api/quotes/missing/pdf')
    expect(res.status).toBe(404)
    expect(mockGenerateQuotePdf).not.toHaveBeenCalled()
  })

  it('streams a generated PDF with the right headers', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [QUOTE_ROW] })
    mockGenerateQuotePdf.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))

    const res = await request(app).get('/api/quotes/quote-1/pdf')

    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('application/pdf')
    expect(res.headers['content-disposition']).toContain('quote-quote-1.pdf')
    expect(mockGenerateQuotePdf).toHaveBeenCalledWith(expect.objectContaining({
      quoteNumber: 'QUOTE-1', customerName: 'James Nguyen', subtotal: 100, total: 72,
    }))
  })
})

describe('POST /api/quotes/:id/send', () => {
  it('returns 404 when the quote does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app).post('/api/quotes/missing/send')
    expect(res.status).toBe(404)
  })

  it('returns 400 when no DocuSeal template is configured for the job type', async () => {
    // roof_renovation has no DOCUSEAL_*_TEMPLATE_ID env var set
    mockQuery.mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW, job_type: 'roof_renovation' }] })
    const res = await request(app).post('/api/quotes/quote-1/send')
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('roof_renovation')
    expect(mockCreateSignatureRequest).not.toHaveBeenCalled()
  })

  it('creates a signature request and marks the quote sent', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [QUOTE_ROW] })
      .mockResolvedValueOnce({ rows: [] }) // UPDATE quotes
      .mockResolvedValueOnce({ rows: [{ ...QUOTE_ROW, docsign_status: 'sent', docsign_envelope_id: '999' }] }) // re-fetch after update
    mockCreateSignatureRequest.mockResolvedValueOnce({ id: 999, submitters: [] })

    const res = await request(app).post('/api/quotes/quote-1/send')

    expect(res.status).toBe(200)
    expect(res.body.docSignStatus).toBe('sent')
    expect(res.body.docSignEnvelopeId).toBe('999')
    expect(mockCreateSignatureRequest).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 'tmpl-123', submitterEmail: 'james@example.com', externalId: 'quote-1',
    }))
  })

  it('returns 500 when DocuSeal fails', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [QUOTE_ROW] })
    mockCreateSignatureRequest.mockRejectedValueOnce(new Error('DocuSeal API error'))

    const res = await request(app).post('/api/quotes/quote-1/send')
    expect(res.status).toBe(500)
  })
})
