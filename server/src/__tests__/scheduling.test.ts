/**
 * Scheduling validation — exercises the actual rules enforced by
 * POST /api/jobs/:id/assign and POST /api/jobs/check-conflicts, against
 * the real controller (with the DB layer mocked out).
 */
import request from 'supertest'
import express from 'express'
import jobsRouter from '../routes/jobs'

jest.mock('../db')
import { query } from '../db'
const mockQuery = query as jest.Mock

const app = express()
app.use(express.json())
app.use('/api/jobs', jobsRouter)

beforeEach(() => {
  mockQuery.mockReset()
})

describe('POST /api/jobs/:id/assign — scheduling rules', () => {
  it('rejects Saturday scheduling', async () => {
    // 2026-09-12 is a Saturday
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-12', startTime: '09:00' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('weekend')
    expect(mockQuery).not.toHaveBeenCalled()
  })

  it('rejects Sunday scheduling', async () => {
    // 2026-09-13 is a Sunday
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-13', startTime: '09:00' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('weekend')
  })

  it('rejects a start time before 07:00', async () => {
    // 2026-09-14 is a Monday
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '06:00' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('07:00')
  })

  it('rejects a start time after 16:00', async () => {
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '17:00' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('16:00')
  })

  it('rejects an empty installerIds array (zod min(1))', async () => {
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: [], date: '2026-09-14', startTime: '09:00' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Validation error')
  })

  it('rejects a malformed date', async () => {
    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: 'not-a-date', startTime: '09:00' })
    expect(res.status).toBe(400)
  })

  it('accepts a valid Monday 07:00 slot and persists the assignment', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-1', estimated_duration: 360 }] }) // existing job + duration lookup
      .mockResolvedValueOnce({ rows: [] })                   // findInstallerConflicts — no overlapping jobs
      .mockResolvedValueOnce({ rows: [] })                   // UPDATE jobs
      .mockResolvedValueOnce({ rows: [] })                   // DELETE job_installers
      .mockResolvedValueOnce({ rows: [] })                   // INSERT job_installers
      .mockResolvedValueOnce({ rows: [] })                   // INSERT job_status_history
      .mockResolvedValueOnce({ rows: [{ id: 'job-1', job_type: 'solar_installation', status: 'scheduled' }] }) // reselect job
      .mockResolvedValueOnce({ rows: [] })                   // attachAssignedInstallers job_installers lookup

    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '07:00' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('scheduled')
  })

  it('returns 404 when the job does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app)
      .post('/api/jobs/missing-job/assign')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '09:00' })
    expect(res.status).toBe(404)
  })

  it('returns 409 with the busy installers named when an installer is already booked', async () => {
    const installerId = '11111111-1111-1111-1111-111111111111'
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-1', estimated_duration: 360 }] }) // existing job lookup
      .mockResolvedValueOnce({ rows: [{ id: 'job-existing', job_type: 'solar_installation', status: 'scheduled' }] }) // conflicting job
      .mockResolvedValueOnce({ rows: [{ job_id: 'job-existing', installer_id: installerId }] }) // attachAssignedInstallers lookup
      .mockResolvedValueOnce({ rows: [{ first_name: 'Alice', last_name: 'Smith' }] }) // busy installer names

    const res = await request(app)
      .post('/api/jobs/job-1/assign')
      .send({ installerIds: [installerId], date: '2026-09-14', startTime: '07:00' })

    expect(res.status).toBe(409)
    expect(res.body.error).toContain('Alice Smith')
    expect(res.body.conflictingJobs).toHaveLength(1)
  })
})

describe('POST /api/jobs/check-conflicts — validation', () => {
  it('rejects a non-uuid installer id', async () => {
    const res = await request(app)
      .post('/api/jobs/check-conflicts')
      .send({ installerIds: ['not-a-uuid'], date: '2026-09-14', startTime: '09:00', durationMinutes: 240 })
    expect(res.status).toBe(400)
  })

  it('rejects a non-positive duration', async () => {
    const res = await request(app)
      .post('/api/jobs/check-conflicts')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '09:00', durationMinutes: 0 })
    expect(res.status).toBe(400)
  })

  it('reports no conflict when the DB returns no overlapping jobs', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] })
    const res = await request(app)
      .post('/api/jobs/check-conflicts')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '09:00', durationMinutes: 240 })
    expect(res.status).toBe(200)
    expect(res.body.hasConflict).toBe(false)
    expect(res.body.conflictingJobs).toEqual([])
  })

  it('reports a conflict when the DB returns an overlapping job', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ id: 'job-existing', job_type: 'solar_installation', status: 'scheduled' }] })
      .mockResolvedValueOnce({ rows: [{ job_id: 'job-existing', installer_id: '11111111-1111-1111-1111-111111111111' }] })

    const res = await request(app)
      .post('/api/jobs/check-conflicts')
      .send({ installerIds: ['11111111-1111-1111-1111-111111111111'], date: '2026-09-14', startTime: '09:00', durationMinutes: 240 })

    expect(res.status).toBe(200)
    expect(res.body.hasConflict).toBe(true)
    expect(res.body.reason).toContain('already booked')
  })
})
