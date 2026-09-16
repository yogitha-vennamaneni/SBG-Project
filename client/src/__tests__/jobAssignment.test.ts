/**
 * Unit tests: Job assignment and conflict detection
 */

import { describe, it, expect } from 'vitest'
import { Job, Installer } from '../types'

// ─── Conflict detection logic ─────────────────────────────────────────────────

interface TimeSlot {
  date: string
  startTime: string  // HH:mm
  durationMinutes: number
}

function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

function slotsOverlap(a: TimeSlot, b: TimeSlot): boolean {
  if (a.date !== b.date) return false
  const aStart = toMinutes(a.startTime)
  const aEnd = aStart + a.durationMinutes
  const bStart = toMinutes(b.startTime)
  const bEnd = bStart + b.durationMinutes
  return aStart < bEnd && bStart < aEnd
}

function installerHasConflict(
  installer: Installer,
  newSlot: TimeSlot,
  existingJobs: Array<Job & { slot?: TimeSlot }>
): boolean {
  const installerJobs = existingJobs.filter(j => j.assignedInstallers.includes(installer.id) && j.slot)
  return installerJobs.some(j => slotsOverlap(newSlot, j.slot!))
}

function installerIsAvailableOnDay(installer: Installer, date: string): boolean {
  const dayOfWeek = new Date(date).getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6
  return installer.availability.some(a => a.dayOfWeek === dayOfWeek)
}

function installerHasSkill(installer: Installer, jobType: Job['jobType']): boolean {
  return installer.skills.includes(jobType)
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const installerAlice: Installer = {
  id: 'installer-alice',
  firstName: 'Alice', lastName: 'Smith',
  email: 'alice@sbg.com.au', phone: '0400000001',
  role: 'electrician',
  licenceNumber: 'REC1111',
  skills: ['solar_installation', 'battery_installation'],
  availability: [
    { dayOfWeek: 1, startTime: '07:00', endTime: '17:00' },  // Monday
    { dayOfWeek: 2, startTime: '07:00', endTime: '17:00' },  // Tuesday
    { dayOfWeek: 3, startTime: '07:00', endTime: '17:00' },  // Wednesday
    { dayOfWeek: 4, startTime: '07:00', endTime: '17:00' },  // Thursday
    { dayOfWeek: 5, startTime: '07:00', endTime: '15:00' },  // Friday
  ],
  isActive: true,
}

const installerBob: Installer = {
  id: 'installer-bob',
  firstName: 'Bob', lastName: 'Jones',
  email: 'bob@sbg.com.au', phone: '0400000002',
  role: 'installer',
  skills: ['solar_installation', 'roof_renovation'],
  availability: [
    { dayOfWeek: 1, startTime: '08:00', endTime: '17:00' },
    { dayOfWeek: 3, startTime: '08:00', endTime: '17:00' },
  ],
  isActive: true,
}

const makeJob = (id: string, installerId: string, slot: TimeSlot): Job & { slot: TimeSlot } => ({
  id, customerId: 'cust-1', jobType: 'solar_installation', status: 'scheduled',
  estimatedDuration: slot.durationMinutes,
  scheduledDate: slot.date, scheduledStartTime: slot.startTime,
  assignedInstallers: [installerId],
  address: { street: '1 Test St', suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
  slot,
})

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Time slot overlap detection', () => {
  it('detects exact same slot as overlapping', () => {
    const slot = { date: '2026-09-15', startTime: '09:00', durationMinutes: 240 }
    expect(slotsOverlap(slot, slot)).toBe(true)
  })

  it('detects partial overlap (new job starts during existing)', () => {
    const existing = { date: '2026-09-15', startTime: '08:00', durationMinutes: 240 }  // 8:00–12:00
    const newSlot  = { date: '2026-09-15', startTime: '10:00', durationMinutes: 120 }  // 10:00–12:00
    expect(slotsOverlap(existing, newSlot)).toBe(true)
  })

  it('detects overlap when new job ends during existing', () => {
    const existing = { date: '2026-09-15', startTime: '10:00', durationMinutes: 240 }  // 10:00–14:00
    const newSlot  = { date: '2026-09-15', startTime: '08:00', durationMinutes: 180 }  // 8:00–11:00
    expect(slotsOverlap(existing, newSlot)).toBe(true)
  })

  it('does not flag non-overlapping back-to-back slots', () => {
    const job1 = { date: '2026-09-15', startTime: '08:00', durationMinutes: 120 }  // 8:00–10:00
    const job2 = { date: '2026-09-15', startTime: '10:00', durationMinutes: 120 }  // 10:00–12:00
    expect(slotsOverlap(job1, job2)).toBe(false)
  })

  it('does not flag jobs on different dates', () => {
    const job1 = { date: '2026-09-15', startTime: '09:00', durationMinutes: 480 }
    const job2 = { date: '2026-09-16', startTime: '09:00', durationMinutes: 480 }
    expect(slotsOverlap(job1, job2)).toBe(false)
  })
})

describe('Installer conflict check', () => {
  const existingJob = makeJob('job-existing', installerAlice.id, {
    date: '2026-09-15', startTime: '09:00', durationMinutes: 240,
  })

  it('reports conflict when installer has overlapping job', () => {
    const newSlot = { date: '2026-09-15', startTime: '10:00', durationMinutes: 120 }
    expect(installerHasConflict(installerAlice, newSlot, [existingJob])).toBe(true)
  })

  it('reports no conflict when installer is free', () => {
    const newSlot = { date: '2026-09-15', startTime: '14:00', durationMinutes: 120 }
    expect(installerHasConflict(installerAlice, newSlot, [existingJob])).toBe(false)
  })

  it('does not flag conflict for a different installer', () => {
    const newSlot = { date: '2026-09-15', startTime: '10:00', durationMinutes: 120 }
    expect(installerHasConflict(installerBob, newSlot, [existingJob])).toBe(false)
  })
})

describe('Installer availability', () => {
  it('returns true when installer works on given day', () => {
    // 2026-09-14 is a Monday (dayOfWeek=1)
    expect(installerIsAvailableOnDay(installerAlice, '2026-09-14')).toBe(true)
  })

  it('returns false for days not in availability', () => {
    // 2026-09-13 is Sunday (dayOfWeek=0) — neither Alice nor Bob works Sunday
    expect(installerIsAvailableOnDay(installerAlice, '2026-09-13')).toBe(false)
  })

  it('handles installers with limited availability', () => {
    // Bob only works Mon & Wed
    // 2026-09-15 = Tuesday → not available
    expect(installerIsAvailableOnDay(installerBob, '2026-09-15')).toBe(false)
    // 2026-09-16 = Wednesday → available
    expect(installerIsAvailableOnDay(installerBob, '2026-09-16')).toBe(true)
  })
})

describe('Installer skill matching', () => {
  it('matches installer with correct skill', () => {
    expect(installerHasSkill(installerAlice, 'solar_installation')).toBe(true)
    expect(installerHasSkill(installerAlice, 'battery_installation')).toBe(true)
  })

  it('returns false for skill installer does not have', () => {
    expect(installerHasSkill(installerAlice, 'ev_charger')).toBe(false)
    expect(installerHasSkill(installerAlice, 'roof_renovation')).toBe(false)
  })

  it('correctly identifies Bob as roof renovation capable', () => {
    expect(installerHasSkill(installerBob, 'roof_renovation')).toBe(true)
    expect(installerHasSkill(installerBob, 'battery_installation')).toBe(false)
  })
})
