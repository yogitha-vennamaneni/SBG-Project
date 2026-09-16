import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { generateQuotePdf } from '../services/pdfService'
import { mapInvoice } from '../utils/mappers'

const INVOICE_SELECT = `
  SELECT i.*,
         c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
         c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
         c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
  FROM invoices i
  JOIN customers c ON c.id = i.customer_id
`

/** GET /api/invoices?jobId=&status= */
export async function list(req: Request, res: Response) {
  const { jobId, status } = req.query
  const conditions: string[] = []
  const params: unknown[] = []
  if (jobId) {
    params.push(jobId)
    conditions.push(`i.job_id = $${params.length}`)
  }
  if (status) {
    params.push(status)
    conditions.push(`i.status = $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await query(`${INVOICE_SELECT} ${where} ORDER BY i.created_at DESC`, params)
  res.json(rows.map(mapInvoice))
}

/** GET /api/invoices/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query(`${INVOICE_SELECT} WHERE i.id = $1`, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' })
  res.json(mapInvoice(rows[0]))
}

/** GET /api/invoices/:id/pdf */
export async function getPdf(req: Request, res: Response) {
  try {
    const { rows } = await query(`${INVOICE_SELECT} WHERE i.id = $1`, [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: 'Invoice not found' })
    const invoice = mapInvoice(rows[0])

    const pdfBytes = await generateQuotePdf({
      quoteNumber: invoice.invoiceNumber,
      customerName: `${invoice.customer?.firstName} ${invoice.customer?.lastName}`,
      customerAddress: `${invoice.customer?.address.street}, ${invoice.customer?.address.suburb} ${invoice.customer?.address.state} ${invoice.customer?.address.postcode}`,
      email: invoice.customer?.email ?? '',
      phone: invoice.customer?.phone ?? '',
      jobType: invoice.type,
      lineItems: invoice.lineItems,
      subtotal: invoice.subtotal!, stcRebate: 0, gst: invoice.gst!, total: invoice.total!,
      depositAmount: 0, balanceAmount: invoice.total!,
      validUntil: invoice.dueDate!,
      generatedAt: new Date().toLocaleDateString('en-AU'),
    })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="invoice-${req.params.id}.pdf"`)
    res.send(Buffer.from(pdfBytes))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Failed to generate invoice PDF' })
  }
}

/** POST /api/invoices */
export async function create(req: Request, res: Response) {
  try {
    const body = z.object({
      jobId: z.string().uuid(),
      customerId: z.string().uuid(),
      type: z.enum(['deposit', 'balance', 'full']),
      lineItems: z.array(z.object({
        description: z.string(),
        qty: z.number(),
        unitPrice: z.number(),
        total: z.number(),
      })),
      subtotal: z.number(),
      gst: z.number(),
      total: z.number(),
      dueDate: z.string(),
    }).parse(req.body)

    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`
    const { rows } = await query(
      `INSERT INTO invoices (job_id, customer_id, invoice_number, type, line_items, subtotal, gst, total, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        body.jobId, body.customerId, invoiceNumber, body.type, JSON.stringify(body.lineItems),
        body.subtotal, body.gst, body.total, body.dueDate,
      ]
    )
    const { rows: invoiceRows } = await query(`${INVOICE_SELECT} WHERE i.id = $1`, [rows[0].id])
    res.status(201).json(mapInvoice(invoiceRows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    console.error(err)
    res.status(500).json({ error: 'Failed to create invoice' })
  }
}
