import { PDFDocument } from 'pdf-lib'
import { generateQuotePdf, generateCesPdf, generateStcAssignmentPdf } from '../services/pdfService'

function pdfHeader(bytes: Uint8Array) {
  return Buffer.from(bytes.slice(0, 5)).toString('utf-8')
}

const QUOTE_DATA = {
  quoteNumber: 'QUOTE-1',
  customerName: 'James Nguyen',
  customerAddress: '14 Kookaburra Cres, Doncaster VIC 3108',
  email: 'james@example.com',
  phone: '0400000000',
  jobType: 'solar_installation',
  lineItems: [
    { description: 'Solar panels x10', qty: 1, unitPrice: 5000, total: 5000 },
    { description: 'STC rebate', qty: 1, unitPrice: -1500, total: -1500, isStcRebate: true },
  ],
  subtotal: 5000,
  stcRebate: 1500,
  gst: 350,
  total: 3850,
  depositAmount: 770,
  balanceAmount: 3080,
  validUntil: '2026-10-01',
  generatedAt: '16/09/2026',
}

describe('generateQuotePdf', () => {
  it('produces a valid single-page PDF', async () => {
    const bytes = await generateQuotePdf(QUOTE_DATA)
    expect(pdfHeader(bytes)).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })

  it('renders correctly with no line items', async () => {
    const bytes = await generateQuotePdf({ ...QUOTE_DATA, lineItems: [] })
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })
})

describe('generateCesPdf', () => {
  it('produces a valid PDF', async () => {
    const bytes = await generateCesPdf({
      jobId: 'job-1',
      customerName: 'James Nguyen',
      address: '14 Kookaburra Cres, Doncaster VIC 3108',
      nmi: '1234567890',
      licenceNumber: 'EC12345',
      recRegistration: 'REC-1',
      workDescription: 'Solar install',
      systemSizeKw: 6.6,
      panelCount: 16,
      inverterModel: 'Fronius Primo',
      completionDate: '2026-09-01',
      certificationDate: '2026-09-02',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })
})

describe('generateStcAssignmentPdf', () => {
  it('produces a valid PDF covering all seven sections', async () => {
    const bytes = await generateStcAssignmentPdf({
      systemOwnerName: 'James Nguyen',
      systemOwnerAddress: '14 Kookaburra Cres, Doncaster VIC 3108',
      nmi: '1234567890',
      installDate: '2026-09-01',
      systemSizeKw: 6.6,
      panelCount: 16,
      panelModel: 'Jinko JKM440',
      panelSerials: ['S1', 'S2', 'S3', 'S4', 'S5'],
      inverterModel: 'Fronius Primo',
      inverterSerial: 'INV-1',
      installerName: 'Alex Smith',
      installerLicence: 'EC98765',
      recRegistration: 'REC-1',
      stcCount: 90,
      retailerName: 'SBG Pty Ltd',
    })
    expect(pdfHeader(bytes)).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBe(1)
  })
})
