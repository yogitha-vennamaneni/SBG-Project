import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { mapCustomer, mapJobWithCustomer } from '../utils/mappers'

const CustomerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(8),
  street: z.string().min(1),
  suburb: z.string().min(1),
  state: z.string().length(3),
  postcode: z.string().length(4),
  nmi: z.string().optional(),
})

/** GET /api/customers?search=&page=&limit= */
export async function list(req: Request, res: Response) {
  const { search, page = '1', limit = '100' } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum
  const searchTerm = search ? `%${String(search).toLowerCase()}%` : null

  const where = searchTerm
    ? `WHERE lower(first_name || ' ' || last_name || ' ' || email || ' ' || suburb) LIKE $1`
    : ''
  const params = searchTerm ? [searchTerm] : []

  const { rows } = await query(
    `SELECT * FROM customers ${where} ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  )
  const { rows: countRows } = await query(`SELECT count(*) FROM customers ${where}`, params)

  res.json({
    data: rows.map(mapCustomer),
    total: Number(countRows[0].count),
    page: pageNum,
    pageSize: limitNum,
  })
}

/** GET /api/customers/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Customer not found' })
  res.json(mapCustomer(rows[0]))
}

/** GET /api/customers/:id/jobs */
export async function getJobs(req: Request, res: Response) {
  const { rows } = await query(
    `SELECT j.*,
            c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
            c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
            c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
     FROM jobs j
     JOIN customers c ON c.id = j.customer_id
     WHERE j.customer_id = $1
     ORDER BY j.created_at DESC`,
    [req.params.id]
  )
  res.json(rows.map(mapJobWithCustomer))
}

/** POST /api/customers */
export async function create(req: Request, res: Response) {
  try {
    const body = CustomerSchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO customers (first_name, last_name, email, phone, street, suburb, state, postcode, nmi)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [body.firstName, body.lastName, body.email, body.phone, body.street, body.suburb, body.state, body.postcode, body.nmi ?? null]
    )
    res.status(201).json(mapCustomer(rows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create customer' })
  }
}

/** PUT /api/customers/:id */
export async function update(req: Request, res: Response) {
  try {
    const body = CustomerSchema.partial().parse(req.body)
    const { rows: existingRows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Customer not found' })

    const merged = { ...existingRows[0], ...toSnakeCaseCustomer(body) }
    const { rows } = await query(
      `UPDATE customers SET first_name=$1, last_name=$2, email=$3, phone=$4, street=$5, suburb=$6, state=$7, postcode=$8, nmi=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [merged.first_name, merged.last_name, merged.email, merged.phone, merged.street, merged.suburb, merged.state, merged.postcode, merged.nmi, req.params.id]
    )
    res.json(mapCustomer(rows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update customer' })
  }
}

function toSnakeCaseCustomer(body: Partial<z.infer<typeof CustomerSchema>>) {
  return {
    ...(body.firstName !== undefined && { first_name: body.firstName }),
    ...(body.lastName !== undefined && { last_name: body.lastName }),
    ...(body.email !== undefined && { email: body.email }),
    ...(body.phone !== undefined && { phone: body.phone }),
    ...(body.street !== undefined && { street: body.street }),
    ...(body.suburb !== undefined && { suburb: body.suburb }),
    ...(body.state !== undefined && { state: body.state }),
    ...(body.postcode !== undefined && { postcode: body.postcode }),
    ...(body.nmi !== undefined && { nmi: body.nmi }),
  }
}
