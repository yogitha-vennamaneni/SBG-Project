import { Request, Response } from 'express'
import { z } from 'zod'
import { query } from '../db'
import { mapJobWithCustomer, mapInstaller, toISODateTime } from '../utils/mappers'

const JobStatusEnum = z.enum([
  'enquiry', 'quoted', 'quote_sent', 'quote_accepted', 'quote_declined',
  'deposit_paid', 'scheduled', 'in_progress', 'completed',
  'invoiced', 'paid', 'cancelled', 'unscheduled', 'confirmed',
])

const JobTypeEnum = z.enum([
  'solar_installation', 'battery_installation', 'ev_charger',
  'roof_renovation', 'solar_adjustment',
])

const JOB_SELECT = `
  SELECT j.*,
         c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
         c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
         c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
  FROM jobs j
  LEFT JOIN customers c ON c.id = j.customer_id
`
// LEFT JOIN: scheduling-export jobs carry inline customer_name/phone/email
// instead of a customer_id, so customers has no matching row for them.

async function attachAssignedInstallers(jobRows: any[]) {
  if (jobRows.length === 0) return []
  const ids = jobRows.map(j => j.id)
  const { rows } = await query(
    `SELECT job_id, installer_id FROM job_installers WHERE job_id = ANY($1::uuid[])`,
    [ids]
  )
  const byJob = new Map<string, string[]>()
  for (const r of rows) {
    if (!byJob.has(r.job_id)) byJob.set(r.job_id, [])
    byJob.get(r.job_id)!.push(r.installer_id)
  }
  const jobsWithAssignedIds = jobRows.map(j => ({
    ...j,
    // scheduling-export jobs assign a single installer via assigned_installer_id
    // rather than a job_installers row.
    assigned_installers: byJob.get(j.id) ?? (j.assigned_installer_id ? [j.assigned_installer_id] : []),
  }))

  const installerIds = Array.from(new Set(jobsWithAssignedIds.flatMap(j => j.assigned_installers as string[])))
  const { rows: installerRows } = installerIds.length
    ? await query(`SELECT * FROM installers WHERE id = ANY($1::uuid[])`, [installerIds])
    : { rows: [] as any[] }
  const { rows: availRows } = installerIds.length
    ? await query(`SELECT * FROM installer_availability WHERE installer_id = ANY($1::uuid[])`, [installerIds])
    : { rows: [] as any[] }
  const availByInstaller = new Map<string, any[]>()
  for (const a of availRows) {
    if (!availByInstaller.has(a.installer_id)) availByInstaller.set(a.installer_id, [])
    availByInstaller.get(a.installer_id)!.push(a)
  }
  const installersById = new Map(installerRows.map((i): [string, any] => [i.id, mapInstaller(i, availByInstaller.get(i.id) ?? [])]))

  return jobsWithAssignedIds.map(j => {
    const job: any = mapJobWithCustomer(j)
    job.installers = (j.assigned_installers as string[]).map(id => installersById.get(id)).filter(Boolean)
    return job
  })
}

/** GET /api/jobs?status=&date=&installerId=&page=&limit= */
export async function list(req: Request, res: Response) {
  const { status, date, installerId, page = '1', limit = '100' } = req.query
  const pageNum = Number(page)
  const limitNum = Number(limit)
  const offset = (pageNum - 1) * limitNum

  const conditions: string[] = []
  const params: unknown[] = []

  if (status) {
    params.push(status)
    conditions.push(`j.status = $${params.length}`)
  }
  if (date) {
    params.push(date)
    conditions.push(`j.scheduled_date = $${params.length}`)
  }
  if (installerId) {
    params.push(installerId)
    // covers both assignment mechanisms: the job_installers join table (original
    // jobs) and the single assigned_installer_id column (scheduling-export jobs)
    conditions.push(`(EXISTS (SELECT 1 FROM job_installers ji WHERE ji.job_id = j.id AND ji.installer_id = $${params.length}) OR j.assigned_installer_id = $${params.length})`)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const { rows } = await query(
    `${JOB_SELECT} ${where} ORDER BY j.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limitNum, offset]
  )
  const { rows: countRows } = await query(
    `SELECT count(*) FROM jobs j ${where}`,
    params
  )

  res.json({
    data: await attachAssignedInstallers(rows),
    total: Number(countRows[0].count),
    page: pageNum,
    pageSize: limitNum,
  })
}

const ConflictCheckSchema = z.object({
  installerIds: z.array(z.string().uuid()),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMinutes: z.number().positive(),
  excludeJobId: z.string().uuid().optional(),
})

/**
 * Finds jobs that overlap the given time window for any of installerIds.
 * Checks both assignment mechanisms — the job_installers join table (jobs
 * created natively) and the assigned_installer_id column (scheduling-export
 * jobs) — so an installer can't be double-booked via either path.
 */
async function findInstallerConflicts(
  installerIds: string[],
  date: string,
  startTime: string,
  durationMinutes: number,
  excludeJobId: string | null
) {
  const { rows } = await query(
    `SELECT DISTINCT j.*,
            c.first_name AS c_first_name, c.last_name AS c_last_name, c.email AS c_email,
            c.phone AS c_phone, c.street AS c_street, c.suburb AS c_suburb, c.state AS c_state,
            c.postcode AS c_postcode, c.nmi AS c_nmi, c.created_at AS c_created_at
     FROM jobs j
     LEFT JOIN customers c ON c.id = j.customer_id
     WHERE (
       EXISTS (SELECT 1 FROM job_installers ji WHERE ji.job_id = j.id AND ji.installer_id = ANY($1::uuid[]))
       OR j.assigned_installer_id = ANY($1::uuid[])
     )
       AND j.scheduled_date = $2::date
       AND ($3::uuid IS NULL OR j.id != $3)
       AND j.scheduled_start_time < ($4::time + ($5 || ' minutes')::interval)
       AND (j.scheduled_start_time + (j.estimated_duration || ' minutes')::interval) > $4::time`,
    [installerIds, date, excludeJobId, startTime, durationMinutes]
  )
  return attachAssignedInstallers(rows)
}

async function findInstallersOnLeave(installerIds: string[], date: string) {
  const { rows } = await query(
    `SELECT id FROM installers
     WHERE id = ANY($1::uuid[])
       AND leave_start IS NOT NULL AND leave_end IS NOT NULL
       AND $2::date BETWEEN leave_start AND leave_end`,
    [installerIds, date]
  )
  return rows.map(r => r.id as string)
}

/** POST /api/jobs/check-conflicts */
export async function checkConflicts(req: Request, res: Response) {
  try {
    const body = ConflictCheckSchema.parse(req.body)
    const [conflictingJobs, installersOnLeave] = await Promise.all([
      findInstallerConflicts(body.installerIds, body.date, body.startTime, body.durationMinutes, body.excludeJobId ?? null),
      findInstallersOnLeave(body.installerIds, body.date),
    ])
    const reasons: string[] = []
    if (conflictingJobs.length > 0) reasons.push('One or more installers are already booked in this time window')
    if (installersOnLeave.length > 0) reasons.push('One or more installers are on leave on this date')
    res.json({
      hasConflict: conflictingJobs.length > 0 || installersOnLeave.length > 0,
      conflictingJobs,
      installersOnLeave,
      reason: reasons.length > 0 ? reasons.join('; ') : undefined,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Conflict check failed' })
  }
}

/** GET /api/jobs/:id */
export async function getById(req: Request, res: Response) {
  const { rows } = await query(`${JOB_SELECT} WHERE j.id = $1`, [req.params.id])
  if (rows.length === 0) return res.status(404).json({ error: 'Job not found' })

  const [job] = await attachAssignedInstallers(rows)
  res.json(job)
}

/** GET /api/jobs/:id/history */
export async function getHistory(req: Request, res: Response) {
  const { rows } = await query(
    `SELECT * FROM job_status_history WHERE job_id = $1 ORDER BY created_at`,
    [req.params.id]
  )
  res.json(rows.map(r => ({
    id: r.id,
    jobId: r.job_id,
    status: r.status,
    note: r.note ?? undefined,
    updatedBy: r.updated_by,
    createdAt: toISODateTime(r.created_at),
  })))
}

/** POST /api/jobs — create from enquiry/quote */
export async function create(req: Request, res: Response) {
  try {
    const body = z.object({
      quoteId: z.string().uuid().optional(),
      customerId: z.string().uuid(),
      jobType: JobTypeEnum,
      street: z.string(),
      suburb: z.string(),
      state: z.string().length(3),
      postcode: z.string().length(4),
      nmi: z.string().optional(),
      estimatedDuration: z.number().int().positive().optional(),
      systemSizeKw: z.number().positive().optional(),
      panelCount: z.number().int().positive().optional(),
      notes: z.string().optional(),
    }).parse(req.body)

    const { rows } = await query(
      `INSERT INTO jobs (quote_id, customer_id, job_type, street, suburb, state, postcode, nmi, estimated_duration, system_size_kw, panel_count, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 240), $10, $11, $12)
       RETURNING id`,
      [
        body.quoteId ?? null, body.customerId, body.jobType, body.street, body.suburb,
        body.state, body.postcode, body.nmi ?? null, body.estimatedDuration ?? null,
        body.systemSizeKw ?? null, body.panelCount ?? null, body.notes ?? null,
      ]
    )
    await query(
      `INSERT INTO job_status_history (job_id, status, note, updated_by) VALUES ($1, 'enquiry', 'Job created', 'admin')`,
      [rows[0].id]
    )

    const { rows: jobRows } = await query(`${JOB_SELECT} WHERE j.id = $1`, [rows[0].id])
    const [job] = await attachAssignedInstallers(jobRows)
    res.status(201).json(job)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to create job' })
  }
}

/** PATCH /api/jobs/:id/status */
export async function updateStatus(req: Request, res: Response) {
  try {
    const { status, note } = z.object({
      status: JobStatusEnum,
      note: z.string().optional(),
    }).parse(req.body)

    const { rows } = await query(
      `UPDATE jobs SET status = $1::job_status, updated_at = NOW(),
              completed_at = CASE WHEN $1::job_status = 'completed' THEN NOW() ELSE completed_at END
       WHERE id = $2 RETURNING id`,
      [status, req.params.id]
    )
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' })

    await query(
      `INSERT INTO job_status_history (job_id, status, note, updated_by) VALUES ($1, $2, $3, 'admin')`,
      [req.params.id, status, note ?? null]
    )

    const { rows: jobRows } = await query(`${JOB_SELECT} WHERE j.id = $1`, [req.params.id])
    const [job] = await attachAssignedInstallers(jobRows)
    res.json(job)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to update job status' })
  }
}

/** POST /api/jobs/:jobId/assign — schedule + assign installers together */
export async function assign(req: Request, res: Response) {
  try {
    const body = z.object({
      installerIds: z.array(z.string().uuid()).min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      startTime: z.string().regex(/^\d{2}:\d{2}$/),
    }).parse(req.body)

    const dayOfWeek = new Date(body.date).getUTCDay()
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return res.status(400).json({ error: 'Jobs cannot be scheduled on a weekend' })
    }

    const hour = parseInt(body.startTime.split(':')[0], 10)
    if (hour < 7 || hour > 16) {
      return res.status(400).json({ error: 'Start time must be between 07:00 and 16:00' })
    }

    const { rows: existing } = await query('SELECT id, estimated_duration FROM jobs WHERE id = $1', [req.params.id])
    if (existing.length === 0) return res.status(404).json({ error: 'Job not found' })

    const conflictingJobs = await findInstallerConflicts(
      body.installerIds, body.date, body.startTime, existing[0].estimated_duration, req.params.id
    )
    if (conflictingJobs.length > 0) {
      const busyInstallerIds = Array.from(new Set(
        conflictingJobs.flatMap((j: any) => j.assignedInstallers ?? []).filter((iid: string) => body.installerIds.includes(iid))
      ))
      const { rows: busyInstallers } = busyInstallerIds.length
        ? await query('SELECT first_name, last_name FROM installers WHERE id = ANY($1::uuid[])', [busyInstallerIds])
        : { rows: [] as any[] }
      const names = busyInstallers.map((i: any) => `${i.first_name} ${i.last_name}`).join(', ')
      return res.status(409).json({
        error: names
          ? `${names} ${busyInstallers.length > 1 ? 'are' : 'is'} already assigned to another job at that time`
          : 'One or more installers are already assigned to another job at that time',
        conflictingJobs,
      })
    }

    const onLeaveIds = await findInstallersOnLeave(body.installerIds, body.date)
    if (onLeaveIds.length > 0) {
      const { rows: onLeaveInstallers } = await query(
        'SELECT first_name, last_name FROM installers WHERE id = ANY($1::uuid[])', [onLeaveIds]
      )
      const names = onLeaveInstallers.map((i: any) => `${i.first_name} ${i.last_name}`).join(', ')
      return res.status(409).json({
        error: `${names} ${onLeaveInstallers.length > 1 ? 'are' : 'is'} on leave on ${body.date}`,
      })
    }

    await query(
      `UPDATE jobs SET scheduled_date = $1, scheduled_start_time = $2, status = 'scheduled', updated_at = NOW() WHERE id = $3`,
      [body.date, body.startTime, req.params.id]
    )
    await query('DELETE FROM job_installers WHERE job_id = $1', [req.params.id])
    for (const installerId of body.installerIds) {
      await query('INSERT INTO job_installers (job_id, installer_id) VALUES ($1, $2)', [req.params.id, installerId])
    }
    await query(
      `INSERT INTO job_status_history (job_id, status, note, updated_by) VALUES ($1, 'scheduled', $2, 'admin')`,
      [req.params.id, `Scheduled for ${body.date} at ${body.startTime}`]
    )

    const { rows: jobRows } = await query(`${JOB_SELECT} WHERE j.id = $1`, [req.params.id])
    const [job] = await attachAssignedInstallers(jobRows)
    res.json(job)
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    res.status(500).json({ error: 'Failed to assign installers' })
  }
}

/** POST /api/jobs/:id/unassign — clear a job's schedule slot and installer assignment */
export async function unassign(req: Request, res: Response) {
  try {
    const { rows: existing } = await query('SELECT id FROM jobs WHERE id = $1', [req.params.id])
    if (existing.length === 0) return res.status(404).json({ error: 'Job not found' })

    await query(
      `UPDATE jobs SET scheduled_date = NULL, scheduled_start_time = NULL, status = 'unscheduled', updated_at = NOW() WHERE id = $1`,
      [req.params.id]
    )
    await query('DELETE FROM job_installers WHERE job_id = $1', [req.params.id])
    await query(
      `INSERT INTO job_status_history (job_id, status, note, updated_by) VALUES ($1, 'unscheduled', 'Removed from schedule', 'admin')`,
      [req.params.id]
    )

    const { rows: jobRows } = await query(`${JOB_SELECT} WHERE j.id = $1`, [req.params.id])
    const [job] = await attachAssignedInstallers(jobRows)
    res.json(job)
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove job from schedule' })
  }
}
