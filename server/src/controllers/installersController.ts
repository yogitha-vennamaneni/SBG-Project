import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { mapInstaller, mapJobWithCustomer } from '../utils/mappers'

const JobTypeEnum = z.enum([
  'solar_installation', 'battery_installation', 'ev_charger',
  'roof_renovation', 'solar_adjustment',
])

const InstallerSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(8),
  role: z.enum(['installer', 'electrician', 'supervisor']),
  licenceNumber: z.string().optional(),
  recRegistration: z.string().optional(),
  skills: z.array(JobTypeEnum),
  // scheduling export fields
  installerCode: z.string().optional(),
  state: z.string().length(3).optional(),
  homeBase: z.string().optional(),
  workingDays: z.array(z.string()).optional(),
  shiftStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  shiftEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  leaveStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  leaveEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
})

const AvailabilityCheckSchema = z.object({
  installerIds: z.array(z.string().uuid()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  jobType: JobTypeEnum,
})

async function attachAvailability(installerRows: any[]) {
  if (installerRows.length === 0) return []
  const ids = installerRows.map(i => i.id)
  const { rows: availRows } = await query(
    `SELECT * FROM installer_availability WHERE installer_id = ANY($1::uuid[])`,
    [ids]
  )
  const byInstaller = new Map<string, any[]>()
  for (const a of availRows) {
    if (!byInstaller.has(a.installer_id)) byInstaller.set(a.installer_id, [])
    byInstaller.get(a.installer_id)!.push(a)
  }
  return installerRows.map(i => mapInstaller(i, byInstaller.get(i.id) ?? []))
}

/** GET /api/installers?skill= */
export async function list(req: Request, res: Response) {
  const { skill } = req.query
  const where = skill ? 'WHERE $1 = ANY(skills)' : ''
  const params = skill ? [skill] : []
  const { rows } = await query(
    `SELECT * FROM installers ${where} ORDER BY first_name`,
    params
  )
  res.json(await attachAvailability(rows))
}

/** GET /api/installers/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query('SELECT * FROM installers WHERE id = $1', [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Installer not found' })
  const [installer] = await attachAvailability(rows)
  res.json(installer)
}

/** GET /api/installers/:id/schedule?from=&to= */
export async function getSchedule(req: Request, res: Response) {
  const { from, to } = req.query
  const { rows } = await query(
    `SELECT DISTINCT j.*,
            c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
            c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
            c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     LEFT JOIN job_installers ji ON ji.job_id = j.id
     WHERE (ji.installer_id = $1 OR j.assigned_installer_id = $1)
       AND ($2::date IS NULL OR j.scheduled_date >= $2)
       AND ($3::date IS NULL OR j.scheduled_date <= $3)
     ORDER BY j.scheduled_date`,
    [req.params.id, from ?? null, to ?? null]
  )
  res.json(rows.map(r => mapJobWithCustomer({ ...r, assigned_installers: [req.params.id] })))
}

/** POST /api/installers */
export async function create(req: Request, res: Response) {
  try {
    const body = InstallerSchema.parse(req.body)
    const { rows } = await query(
      `INSERT INTO installers (
         first_name, last_name, email, phone, role, licence_number, rec_registration, skills,
         installer_code, state, home_base, working_days, shift_start, shift_end, leave_start, leave_end
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::job_type[], $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        body.firstName, body.lastName, body.email, body.phone, body.role,
        body.licenceNumber ?? null, body.recRegistration ?? null, body.skills,
        body.installerCode ?? null, body.state ?? null, body.homeBase ?? null,
        body.workingDays ?? null, body.shiftStart ?? null, body.shiftEnd ?? null,
        body.leaveStart ?? null, body.leaveEnd ?? null,
      ]
    )
    res.status(201).json(mapInstaller(rows[0]))
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create installer' })
  }
}

/** POST /api/installers/availability-check */
export async function availabilityCheck(req: Request, res: Response) {
  try {
    const body = AvailabilityCheckSchema.parse(req.body)
    const dayOfWeek = new Date(body.date).getDay()

    const { rows: availableRows } = await query(
      `SELECT DISTINCT i.id
       FROM installers i
       JOIN installer_availability a ON a.installer_id = i.id
       WHERE i.id = ANY($1::uuid[])
         AND a.day_of_week = $2
         AND a.start_time <= $3::time AND a.end_time > $3::time
         AND NOT EXISTS (
           SELECT 1 FROM job_installers ji
           JOIN jobs j ON j.id = ji.job_id
           WHERE ji.installer_id = i.id AND j.scheduled_date = $4::date
         )
         AND (i.leave_start IS NULL OR i.leave_end IS NULL OR $4::date NOT BETWEEN i.leave_start AND i.leave_end)`,
      [body.installerIds, dayOfWeek, body.startTime, body.date]
    )
    const available = availableRows.map(r => r.id)
    const conflicts = body.installerIds.filter(id => !available.includes(id))

    res.json({ data: { available, conflicts, checked: body } })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Availability check failed' })
  }
}

/** PUT /api/installers/:id */
export async function update(req: Request, res: Response) {
  try {
    const body = InstallerSchema.partial().parse(req.body)
    const { rows: existingRows } = await query('SELECT * FROM installers WHERE id = $1', [req.params.id])
    if (existingRows.length === 0) return res.status(404).json({ error: 'Installer not found' })
    const existing = existingRows[0]

    const { rows } = await query(
      `UPDATE installers SET
         first_name=$1, last_name=$2, email=$3, phone=$4, role=$5, licence_number=$6, rec_registration=$7, skills=$8::job_type[],
         installer_code=$9, state=$10, home_base=$11, working_days=$12, shift_start=$13, shift_end=$14, leave_start=$15, leave_end=$16
       WHERE id=$17 RETURNING *`,
      [
        body.firstName ?? existing.first_name,
        body.lastName ?? existing.last_name,
        body.email ?? existing.email,
        body.phone ?? existing.phone,
        body.role ?? existing.role,
        body.licenceNumber ?? existing.licence_number,
        body.recRegistration ?? existing.rec_registration,
        body.skills ?? existing.skills,
        body.installerCode ?? existing.installer_code,
        body.state ?? existing.state,
        body.homeBase ?? existing.home_base,
        body.workingDays ?? existing.working_days,
        body.shiftStart ?? existing.shift_start,
        body.shiftEnd ?? existing.shift_end,
        body.leaveStart ?? existing.leave_start,
        body.leaveEnd ?? existing.leave_end,
        req.params.id,
      ]
    )
    const [installer] = await attachAvailability(rows)
    res.json(installer)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update installer' })
  }
}
