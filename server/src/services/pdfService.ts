/**
 * PDF generation service using pdf-lib.
 * Generates: Quotes, Invoices, CES (Certificate of Electrical Safety), STC Assignment Forms
 */

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

// SBG brand RGB values
const SBG_BLUE = rgb(0.114, 0.114, 1)     // #1d1dff
const SBG_YELLOW = rgb(1, 0.859, 0.078)   // #ffdb14
const DARK = rgb(0.129, 0.145, 0.255)      // ~#212529
const LIGHT_GRAY = rgb(0.96, 0.965, 0.98)

interface QuoteData {
  quoteNumber: string
  customerName: string
  customerAddress: string
  email: string
  phone: string
  jobType: string
  lineItems: Array<{ description: string; qty: number; unitPrice: number; total: number; isStcRebate?: boolean }>
  subtotal: number
  stcRebate: number
  gst: number
  total: number
  depositAmount: number
  balanceAmount: number
  validUntil: string
  generatedAt: string
}

interface InvoiceData {
  invoiceNumber: string
  customerName: string
  customerAddress: string
  email: string
  jobType: string
  type: 'deposit' | 'balance' | 'full'
  lineItems: Array<{ description: string; qty: number; unitPrice: number; total: number }>
  subtotal: number
  gst: number
  total: number
  dueDate: string
  stripePaymentUrl?: string
}

interface CesData {
  jobId: string
  customerName: string
  address: string
  nmi: string
  licenceNumber: string
  recRegistration: string
  workDescription: string
  systemSizeKw: number
  panelCount: number
  inverterModel: string
  completionDate: string
  certificationDate: string
}

interface StcData {
  systemOwnerName: string
  systemOwnerAddress: string
  nmi: string
  installDate: string
  systemSizeKw: number
  panelCount: number
  panelModel: string
  panelSerials: string[]
  inverterModel: string
  inverterSerial: string
  installerName: string
  installerLicence: string
  recRegistration: string
  stcCount: number
  retailerName: string
}

// Helper: add SBG logo header
async function addHeader(page: PDFPage, font: PDFFont, boldFont: PDFFont) {
  const { width } = page.getSize()
  // Blue header bar
  page.drawRectangle({ x: 0, y: page.getSize().height - 80, width, height: 80, color: SBG_BLUE })
  // Company name
  page.drawText('Solar Battery Group', {
    x: 28, y: page.getSize().height - 50,
    size: 22, font: boldFont, color: rgb(1, 1, 1),
  })
  page.drawText('Australia\'s Largest Solar Battery Installer', {
    x: 28, y: page.getSize().height - 68,
    size: 10, font, color: SBG_YELLOW,
  })
  // Contact details top right
  page.drawText('1300 223 224  |  info@solarbatterygroup.com.au', {
    x: width - 260, y: page.getSize().height - 50,
    size: 9, font, color: rgb(1, 1, 1),
  })
  page.drawText('www.solarbatterygroup.com.au', {
    x: width - 200, y: page.getSize().height - 65,
    size: 9, font, color: SBG_YELLOW,
  })
}

function drawRow(page: PDFPage, font: PDFFont, boldFont: PDFFont, y: number,
  cols: [string, string, string, string], isHeader = false, isRebate = false) {
  const { width } = page.getSize()
  if (isHeader) {
    page.drawRectangle({ x: 28, y: y - 4, width: width - 56, height: 20, color: LIGHT_GRAY })
  }
  const color = isRebate ? rgb(0, 0.5, 0) : DARK
  const f = isHeader ? boldFont : font
  const sz = isHeader ? 9 : 9
  page.drawText(cols[0], { x: 35, y, size: sz, font: f, color })
  page.drawText(cols[1], { x: 340, y, size: sz, font: f, color })
  page.drawText(cols[2], { x: 390, y, size: sz, font: f, color })
  page.drawText(cols[3], { x: width - 60, y, size: sz, font: f, color, maxWidth: 55 })
}

export async function generateQuotePdf(data: QuoteData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])  // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { height } = page.getSize()

  await addHeader(page, font, bold)

  // Title
  page.drawText('QUOTE', { x: 28, y: height - 110, size: 28, font: bold, color: SBG_BLUE })
  page.drawText(`#${data.quoteNumber}`, { x: 110, y: height - 110, size: 16, font, color: DARK })

  // Customer block
  let y = height - 140
  page.drawText('To:', { x: 28, y, size: 9, font: bold, color: DARK })
  page.drawText(data.customerName, { x: 50, y, size: 9, font, color: DARK })
  y -= 14; page.drawText(data.customerAddress, { x: 50, y, size: 9, font, color: DARK })
  y -= 14; page.drawText(data.email, { x: 50, y, size: 9, font, color: DARK })

  // Quote meta right side
  const metaX = 380
  const metaStartY = height - 140
  ;[
    ['Job Type:', data.jobType],
    ['Valid Until:', data.validUntil],
    ['Generated:', data.generatedAt],
  ].forEach(([label, val], i) => {
    page.drawText(label, { x: metaX, y: metaStartY - i * 14, size: 9, font: bold, color: DARK })
    page.drawText(val, { x: metaX + 75, y: metaStartY - i * 14, size: 9, font, color: DARK })
  })

  // Divider
  y = height - 210
  page.drawLine({ start: { x: 28, y }, end: { x: 567, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })

  // Line items header
  y -= 15
  drawRow(page, font, bold, y, ['Description', 'Qty', 'Unit Price', 'Total'], true)
  y -= 22

  for (const item of data.lineItems) {
    drawRow(page, font, bold, y, [
      item.description,
      item.qty.toString(),
      `$${item.unitPrice.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
      `$${Math.abs(item.total).toLocaleString('en-AU', { minimumFractionDigits: 2 })}`,
    ], false, item.isStcRebate)
    if (item.isStcRebate) {
      y -= 4
      page.drawText('(Government rebate — reduces total cost)', { x: 35, y, size: 7, font, color: rgb(0, 0.5, 0) })
    }
    y -= 18
  }

  // Totals box
  y -= 10
  page.drawLine({ start: { x: 28, y }, end: { x: 567, y }, thickness: 1, color: rgb(0.85, 0.85, 0.85) })
  const totals = [
    ['Subtotal', `$${data.subtotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
    ['STC Rebate', `-$${data.stcRebate.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
    ['GST (10%)', `$${data.gst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
    ['TOTAL DUE', `$${data.total.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
    ['20% Deposit', `$${data.depositAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
    ['Balance on completion', `$${data.balanceAmount.toLocaleString('en-AU', { minimumFractionDigits: 2 })}`],
  ]
  for (const [label, val] of totals) {
    y -= 18
    const isTot = label === 'TOTAL DUE'
    if (isTot) {
      page.drawRectangle({ x: 390, y: y - 4, width: 177, height: 20, color: SBG_BLUE })
    }
    page.drawText(label, { x: 390, y, size: isTot ? 10 : 9, font: bold, color: isTot ? rgb(1, 1, 1) : DARK })
    page.drawText(val, { x: 500, y, size: isTot ? 10 : 9, font: bold, color: isTot ? SBG_YELLOW : DARK })
  }

  // Footer
  const footerY = 50
  page.drawRectangle({ x: 0, y: 0, width: 595, height: footerY, color: SBG_BLUE })
  page.drawText('Quote valid for 30 days. GST included. STCs assigned to Solar Battery Group as part of this agreement.',
    { x: 28, y: 30, size: 7, font, color: rgb(0.8, 0.8, 0.8) })
  page.drawText('ABN: 12 345 678 901', { x: 28, y: 16, size: 7, font, color: rgb(0.8, 0.8, 0.8) })

  return doc.save()
}

export async function generateCesPdf(data: CesData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  // Header
  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: SBG_BLUE })
  page.drawText('CERTIFICATE OF ELECTRICAL SAFETY', { x: 28, y: height - 38, size: 14, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Electricity Safety Act 1998 (Vic) — Energy Safe Victoria', { x: 28, y: height - 54, size: 8, font, color: SBG_YELLOW })

  // Two columns: Compliance (left) | Inspection (right)
  const col = width / 2
  page.drawLine({ start: { x: col, y: height - 65 }, end: { x: col, y: 60 }, thickness: 1, color: rgb(0.8, 0.8, 0.8) })

  // Left: Compliance Certificate
  let y = height - 85
  page.drawText('COMPLIANCE CERTIFICATE', { x: 28, y, size: 11, font: bold, color: SBG_BLUE })
  const compFields: [string, string][] = [
    ['Licensed Electrical Worker:', data.licenceNumber],
    ['REC/CEC Registration No.:', data.recRegistration],
    ['Customer Name:', data.customerName],
    ['Installation Address:', data.address],
    ['NMI:', data.nmi],
    ['System Size:', `${data.systemSizeKw} kW`],
    ['Panel Count:', data.panelCount.toString()],
    ['Inverter:', data.inverterModel],
    ['Work Description:', data.workDescription],
    ['Date of Completion:', data.completionDate],
    ['Date of Certification:', data.certificationDate],
  ]
  for (const [label, val] of compFields) {
    y -= 22
    page.drawText(label, { x: 28, y, size: 9, font: bold, color: DARK })
    page.drawText(val, { x: 28, y: y - 12, size: 9, font, color: DARK, maxWidth: col - 40 })
    y -= 12
  }

  // Installer signature block
  y -= 20
  page.drawLine({ start: { x: 28, y }, end: { x: col - 20, y }, thickness: 0.5, color: rgb(0.5, 0.5, 0.5) })
  page.drawText('Installer Signature', { x: 28, y: y - 14, size: 8, font, color: rgb(0.5, 0.5, 0.5) })

  // Right: Inspection Certificate (completed by ESV inspector)
  y = height - 85
  page.drawText('INSPECTION CERTIFICATE', { x: col + 15, y, size: 11, font: bold, color: rgb(0.5, 0.5, 0.5) })
  page.drawText('(Completed by ESV Inspector)', { x: col + 15, y: y - 14, size: 8, font, color: rgb(0.6, 0.6, 0.6) })

  const inspFields = ['Inspector Name:', 'Inspector Licence:', 'Inspection Date:', 'Result:', 'Notes:']
  let iy = y - 40
  for (const label of inspFields) {
    page.drawText(label, { x: col + 15, y: iy, size: 9, font: bold, color: rgb(0.6, 0.6, 0.6) })
    page.drawLine({ start: { x: col + 15, y: iy - 14 }, end: { x: width - 28, y: iy - 14 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
    iy -= 40
  }

  // Footer
  page.drawRectangle({ x: 0, y: 0, width, height: 40, color: LIGHT_GRAY })
  page.drawText(`Job #${data.jobId}  |  This certificate must be retained for a minimum of 5 years.`, { x: 28, y: 20, size: 7, font, color: DARK })

  return doc.save()
}

export async function generateStcAssignmentPdf(data: StcData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 1050])  // Slightly taller for all 7 sections
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const { width, height } = page.getSize()

  page.drawRectangle({ x: 0, y: height - 60, width, height: 60, color: SBG_BLUE })
  page.drawText('STC ASSIGNMENT FORM', { x: 28, y: height - 35, size: 16, font: bold, color: rgb(1, 1, 1) })
  page.drawText('Renewable Energy (Electricity) Act 2000 — Clean Energy Regulator', { x: 28, y: height - 52, size: 8, font, color: SBG_YELLOW })

  const sections: Array<{ title: string; fields: Array<[string, string]> }> = [
    {
      title: 'SECTION 1 — System Owner Details',
      fields: [['Name:', data.systemOwnerName], ['Address:', data.systemOwnerAddress], ['NMI:', data.nmi]],
    },
    {
      title: 'SECTION 2 — Installation Details',
      fields: [
        ['Installation Date:', data.installDate],
        ['Postcode:', data.systemOwnerAddress.slice(-4)],
        ['System Capacity (kW):', data.systemSizeKw.toString()],
      ],
    },
    {
      title: 'SECTION 3 — Component Details',
      fields: [
        ['Panel Manufacturer/Model:', data.panelModel],
        ['Panel Quantity:', data.panelCount.toString()],
        ['Panel Serial Numbers:', data.panelSerials.slice(0, 4).join(', ')],
        ['Inverter Model:', data.inverterModel],
        ['Inverter Serial:', data.inverterSerial],
      ],
    },
    {
      title: 'SECTION 4 — Mandatory Declaration',
      fields: [
        ['STCs Assigned:', data.stcCount.toString()],
        ['Retailer/Assignee:', data.retailerName],
        ['CEC Accreditation:', data.recRegistration],
      ],
    },
    {
      title: 'SECTION 5 — Retailer / Designer Statement',
      fields: [['Retailer Name:', data.retailerName], ['Statement:', 'We confirm the above system meets all CEC requirements.']],
    },
    {
      title: 'SECTION 6 — Installer Statement',
      fields: [
        ['Installer Name:', data.installerName],
        ['Electrical Licence:', data.installerLicence],
        ['Declaration:', 'I declare that the installation complies with AS/NZS 5033 and the Electricity Safety Act.'],
      ],
    },
    {
      title: 'SECTION 7 — Retailer Statement (Post-Install)',
      fields: [['Confirmed by:', data.retailerName], ['Date:', data.installDate]],
    },
  ]

  let y = height - 80
  for (const section of sections) {
    y -= 20
    page.drawRectangle({ x: 28, y: y - 4, width: width - 56, height: 18, color: LIGHT_GRAY })
    page.drawText(section.title, { x: 35, y, size: 9, font: bold, color: SBG_BLUE })
    y -= 8
    for (const [label, val] of section.fields) {
      y -= 16
      page.drawText(label, { x: 35, y, size: 8, font: bold, color: DARK })
      page.drawText(val, { x: 200, y, size: 8, font, color: DARK, maxWidth: width - 230 })
    }
    // Signature line at end of sections 5, 6, 7
    if ([4, 5, 6].includes(sections.indexOf(section))) {
      y -= 18
      page.drawLine({ start: { x: 35, y }, end: { x: 200, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
      page.drawText('Signature', { x: 35, y: y - 12, size: 7, font, color: rgb(0.6, 0.6, 0.6) })
      page.drawLine({ start: { x: 250, y }, end: { x: 380, y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) })
      page.drawText('Date', { x: 250, y: y - 12, size: 7, font, color: rgb(0.6, 0.6, 0.6) })
      y -= 12
    }
  }

  return doc.save()
}
