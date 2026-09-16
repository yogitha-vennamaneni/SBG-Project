import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { mapEnquiry } from '../utils/mappers'

const EnquirySchema = z.object({
  customerId: z.string().uuid(),
  jobType: z.enum(['solar_installation', 'battery_installation', 'ev_charger', 'roof_renovation', 'solar_adjustment']),
  description: z.string().optional(),
  // Solar / battery
  roofType: z.enum(['tile', 'tin', 'flat', 'tilt']).optional(),
  systemSizeKw: z.number().positive().optional(),
  panelCount: z.number().int().positive().optional(),
  batteryCapacityKwh: z.number().positive().optional(),
  existingSolarKw: z.number().nonnegative().optional(),
  // EV charger
  evChargerAmps: z.union([z.literal(16), z.literal(32)]).optional(),
  phaseType: z.enum(['single', 'three']).optional(),
  // Roof
  roofArea: z.number().positive().optional(),
  // Weather
  weatherRisk: z.enum(['low', 'medium', 'high']).optional(),
  weatherNote: z.string().optional(),
})

const ENQUIRY_SELECT = `
  SELECT e.*,
         c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
         c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
         c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
  FROM enquiries e
  JOIN customers c ON c.id = e.customer_id
`

/** GET /api/enquiries?status=&jobType=&page=&limit= */
export async function list(req: Request, res: Response) {
  const { status, jobType, page = '1', limit = '20' } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const conditions: string[] = []
  const params: unknown[] = []
  if (status) {
    params.push(status)
    conditions.push(`e.status = $${params.length}`)
  }
  if (jobType) {
    params.push(jobType)
    conditions.push(`e.job_type = $${params.length}`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await query(
    `${ENQUIRY_SELECT} ${where} ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  )
  const { rows: countRows } = await query(`SELECT count(*) FROM enquiries e ${where}`, params)

  res.json({
    data: rows.map(mapEnquiry),
    total: Number(countRows[0].count),
    page: pageNum,
    pageSize: limitNum,
  })
}

/** GET /api/enquiries/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query(`${ENQUIRY_SELECT} WHERE e.id = $1`, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Enquiry not found' })
  res.json(mapEnquiry(rows[0]))
}

/** POST /api/enquiries */
export async function create(req: Request, res: Response) {
  try {
    const body = EnquirySchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO enquiries (
         customer_id, job_type, description, roof_type, system_size_kw, panel_count,
         battery_capacity_kwh, existing_solar_kw, ev_charger_amps, phase_type,
         roof_area, weather_risk, weather_note
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        body.customerId, body.jobType, body.description ?? null, body.roofType ?? null,
        body.systemSizeKw ?? null, body.panelCount ?? null, body.batteryCapacityKwh ?? null,
        body.existingSolarKw ?? null, body.evChargerAmps ?? null, body.phaseType ?? null,
        body.roofArea ?? null, body.weatherRisk ?? null, body.weatherNote ?? null,
      ]
    )
    const { rows: enquiryRows } = await query(`${ENQUIRY_SELECT} WHERE e.id = $1`, [rows[0].id])
    res.status(201).json(mapEnquiry(enquiryRows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create enquiry' })
  }
}

/** PUT /api/enquiries/:id */
export async function update(req: Request, res: Response) {
  try {
    const body = EnquirySchema.partial().parse(req.body)
    const { rows: existingRows } = await query('SELECT * FROM enquiries WHERE id = $1', [req.params.id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Enquiry not found' })
    const existing = existingRows[0]

    const { rows } = await query(
      `UPDATE enquiries SET
         customer_id=$1, job_type=$2, description=$3, roof_type=$4, system_size_kw=$5,
         panel_count=$6, battery_capacity_kwh=$7, existing_solar_kw=$8, ev_charger_amps=$9,
         phase_type=$10, roof_area=$11, weather_risk=$12, weather_note=$13, updated_at=NOW()
       WHERE id=$14 RETURNING id`,
      [
        body.customerId ?? existing.customer_id,
        body.jobType ?? existing.job_type,
        body.description ?? existing.description,
        body.roofType ?? existing.roof_type,
        body.systemSizeKw ?? existing.system_size_kw,
        body.panelCount ?? existing.panel_count,
        body.batteryCapacityKwh ?? existing.battery_capacity_kwh,
        body.existingSolarKw ?? existing.existing_solar_kw,
        body.evChargerAmps ?? existing.ev_charger_amps,
        body.phaseType ?? existing.phase_type,
        body.roofArea ?? existing.roof_area,
        body.weatherRisk ?? existing.weather_risk,
        body.weatherNote ?? existing.weather_note,
        req.params.id,
      ]
    )
    const { rows: enquiryRows } = await query(`${ENQUIRY_SELECT} WHERE e.id = $1`, [rows[0].id])
    res.json(mapEnquiry(enquiryRows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update enquiry' })
  }
}
