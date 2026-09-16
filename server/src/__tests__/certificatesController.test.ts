import request from 'supertest'
import express from 'express'
import certificatesRouter from '../routes/certificates'

jest.mock('../db')
jest.mock('../services/pdfService')

import { query } from '../db'
import { generateCesPdf, generateStcAssignmentPdf } from '../services/pdfService'

const mockQuery = query as jest.Mock
const mockGenerateCesPdf = generateCesPdf as jest.Mock
const mockGenerateStcAssignmentPdf = generateStcAssignmentPdf as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/jobs/:jobId/certificates', certificatesRouter)

const CES_ROW = {
  id: 'cert-1', job_id: 'job-1', type: 'CES',
  ces_work_description: 'Installed 6.6kW system', ces_licence_number: 'REC7845', ces_rec_registration: 'A5023451',
  ces_completion_date: new Date(2026, 8, 15), ces_certification_date: new Date(2026, 8, 15),
  stc_panel_serials: null, stc_system_owner: null, stc_install_date: null,
  stc_system_size_kw: null, stc_certificate_qty: null,
  pdf_signed_url: null, generated_at: null, created_at: new Date(),
}

beforeEach(() => {
  mockQuery.mockReset()
  mockGenerateCesPdf.mockReset()
  mockGenerateStcAssignmentPdf.mockReset()
})

describe('GET /api/jobs/:jobId/certificates', () => {
  it('lists certificates for a job', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CES_ROW] })
    const res = await request(app).get('/api/jobs/job-1/certificates')
    expect(res.status).toBe(200)
    expect(res.body[0].type).toBe('CES')
    expect(mockQuery.mock.calls[0][1]).toEqual(['job-1'])
  })
})

describe('POST /api/jobs/:jobId/certificates', () => {
  it('rejects an invalid type', async () => {
    const res = await request(app).post('/api/jobs/job-1/certificates').send({ type: 'not_a_type' })
    expect(res.status).toBe(400)
  })

  it('creates a certificate scoped to the job in the URL', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [CES_ROW] })
    const res = await request(app).post('/api/jobs/job-1/certificates').send({ type: 'CES', cesLicenceNumber: 'REC7845' })
    expect(res.status).toBe(201)
    expect(mockQuery.mock.calls[0][1][0]).toBe('job-1')
  })
})

describe('GET /api/jobs/:jobId/certificates/:certId/pdf', () => {
  it('generates a CES PDF by default', async () => {
    mockGenerateCesPdf.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
    const res = await request(app).get('/api/jobs/job-1/certificates/cert-1/pdf')
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain('ces-job-1.pdf')
    expect(mockGenerateStcAssignmentPdf).not.toHaveBeenCalled()
  })

  it('generates an STC assignment PDF when type=STC_assignment', async () => {
    mockGenerateStcAssignmentPdf.mockResolvedValueOnce(new Uint8Array([1, 2, 3]))
    const res = await request(app).get('/api/jobs/job-1/certificates/cert-1/pdf').query({ type: 'STC_assignment' })
    expect(res.status).toBe(200)
    expect(res.headers['content-disposition']).toContain('stc-job-1.pdf')
    expect(mockGenerateCesPdf).not.toHaveBeenCalled()
  })
})
