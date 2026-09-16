import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { generateQuotePdf } from '../services/pdfService'
import { createSignatureRequest } from '../services/docusealService'
import { mapQuote } from '../utils/mappers'

const TEMPLATE_ID_BY_JOB_TYPE: Record<string, string | undefined> = {
  solar_installation: process.env.DOCUSEAL_SOLAR_TEMPLATE_ID,
  battery_installation: process.env.DOCUSEAL_BATTERY_TEMPLATE_ID,
  ev_charger: process.env.DOCUSEAL_EV_TEMPLATE_ID,
  roof_renovation: process.env.DOCUSEAL_ROOF_TEMPLATE_ID,
  solar_adjustment: process.env.DOCUSEAL_ADJUSTMENT_TEMPLATE_ID,
}

const QUOTE_SELECT = `
  SELECT q.*,
         c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
         c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
         c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
  FROM quotes q
  JOIN customers c ON c.id = q.customer_id
`

const JobTypeEnum = z.enum([
  'solar_installation', 'battery_installation', 'ev_charger',
  'roof_renovation', 'solar_adjustment',
])

const LineItemSchema = z.object({
  description: z.string(),
  qty: z.number(),
  unitPrice: z.number(),
  total: z.number(),
  isStcRebate: z.boolean().optional(),
})

const QuoteCreateSchema = z.object({
  enquiryId: z.string().uuid().optional(),
  customerId: z.string().uuid(),
  jobType: JobTypeEnum,
  lineItems: z.array(LineItemSchema),
  subtotal: z.number(),
  stcRebate: z.number().default(0),
  gst: z.number(),
  total: z.number(),
  depositAmount: z.number(),
  balanceAmount: z.number(),
  validUntil: z.string(),
})

/** GET /api/quotes?status= */
export async function list(req: Request, res: Response) {
  const { status, page = '1', limit = '100' } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const where = status ? 'WHERE q.docsign_status = $1' : ''
  const params = status ? [status] : []

  const { rows } = await query(
    `${QUOTE_SELECT} ${where} ORDER BY q.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  )
  const { rows: countRows } = await query(`SELECT count(*) FROM quotes q ${where}`, params)

  res.json({
    data: rows.map(mapQuote),
    total: Number(countRows[0].count),
    page: pageNum,
    pageSize: limitNum,
  })
}

/** GET /api/quotes/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Quote not found' })
  res.json(mapQuote(rows[0]))
}

/** POST /api/quotes */
export async function create(req: Request, res: Response) {
  try {
    const body = QuoteCreateSchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO quotes (enquiry_id, customer_id, job_type, line_items, subtotal, stc_rebate, gst, total, deposit_amount, balance_amount, valid_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id`,
      [
        body.enquiryId ?? null, body.customerId, body.jobType, JSON.stringify(body.lineItems),
        body.subtotal, body.stcRebate, body.gst, body.total, body.depositAmount, body.balanceAmount, body.validUntil,
      ]
    )
    const { rows: quoteRows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [rows[0].id])
    res.status(201).json(mapQuote(quoteRows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create quote' })
  }
}

/** PUT /api/quotes/:id */
export async function update(req: Request, res: Response) {
  try {
    const body = QuoteCreateSchema.partial().parse(req.body)
    const { rows: existingRows } = await query('SELECT * FROM quotes WHERE id = $1', [req.params.id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Quote not found' })
    const existing = existingRows[0]

    const { rows } = await query(
      `UPDATE quotes SET line_items=$1, subtotal=$2, stc_rebate=$3, gst=$4, total=$5, deposit_amount=$6, balance_amount=$7, valid_until=$8, updated_at=NOW()
       WHERE id=$9 RETURNING id`,
      [
        body.lineItems ? JSON.stringify(body.lineItems) : existing.line_items,
        body.subtotal ?? existing.subtotal,
        body.stcRebate ?? existing.stc_rebate,
        body.gst ?? existing.gst,
        body.total ?? existing.total,
        body.depositAmount ?? existing.deposit_amount,
        body.balanceAmount ?? existing.balance_amount,
        body.validUntil ?? existing.valid_until,
        req.params.id,
      ]
    )
    const { rows: quoteRows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [rows[0].id])
    res.json(mapQuote(quoteRows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update quote' })
  }
}

/** GET /api/quotes/:id/pdf — stream the PDF */
export async function getPdf(req: Request, res: Response) {
  const { rows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Quote not found' })
  const quote = mapQuote(rows[0])

  const pdf = await generateQuotePdf({
    quoteNumber: quote.id.toUpperCase(),
    customerName: `${quote.customer?.firstName} ${quote.customer?.lastName}`,
    customerAddress: `${quote.customer?.address.street}, ${quote.customer?.address.suburb} ${quote.customer?.address.state} ${quote.customer?.address.postcode}`,
    email: quote.customer?.email ?? '',
    phone: quote.customer?.phone ?? '',
    jobType: quote.jobType,
    lineItems: quote.lineItems,
    subtotal: quote.subtotal!, stcRebate: quote.stcRebate!, gst: quote.gst!, total: quote.total!,
    depositAmount: quote.depositAmount!, balanceAmount: quote.balanceAmount!,
    validUntil: quote.validUntil!,
    generatedAt: new Date().toLocaleDateString('en-AU'),
  })
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `inline; filename=quote-${req.params.id}.pdf`)
  res.send(Buffer.from(pdf))
}

/** POST /api/quotes/:id/send — send via DocuSeal for e-signature */
export async function send(req: Request, res: Response) {
  try {
    const { rows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Quote not found' })
    const quote = mapQuote(rows[0])

    const templateId = TEMPLATE_ID_BY_JOB_TYPE[quote.jobType]
    if (!templateId) {
      return res.status(400).json({ error: `No DocuSeal template configured for job type "${quote.jobType}"` })
    }

    const submission = await createSignatureRequest({
      templateId,
      submitterEmail: quote.customer?.email ?? '',
      submitterName: `${quote.customer?.firstName} ${quote.customer?.lastName}`,
      externalId: req.params.id,
    })

    await query(
      `UPDATE quotes SET docsign_status = 'sent', docsign_envelope_id = $1, updated_at = NOW() WHERE id = $2`,
      [String(submission.id), req.params.id]
    )

    const { rows: quoteRows } = await query(`${QUOTE_SELECT} WHERE q.id = $1`, [req.params.id])
    res.json(mapQuote(quoteRows[0]))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to send quote for signature' })
  }
}
