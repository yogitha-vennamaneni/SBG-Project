import { describe, it, expect } from 'vitest'
import { installerIneligibilityReason, isInstallerOnLeave } from '../utils/installerEligibility'
import { Installer, Job } from '../types'

const baseInstaller: Installer = {
  id: 'installer-1',
  firstName: 'Casey', lastName: 'Lee',
  email: 'casey@sbg.com.au', phone: '0400000003',
  role: 'installer',
  skills: ['solar_installation'],
  availability: [],
  isActive: true,
  state: 'VIC',
  workingDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
}

const baseJob: Job = {
  id: 'job-1', customerId: 'cust-1', jobType: 'solar_installation', status: 'scheduled',
  estimatedDuration: 120,
  address: { street: '1 Test St', suburb: 'Melbourne', state: 'VIC', postcode: '3000' },
  assignedInstallers: [],
  createdAt: '2026-09-01T00:00:00Z', updatedAt: '2026-09-01T00:00:00Z',
}

describe('isInstallerOnLeave', () => {
  it('returns true for a date inside the leave range (inclusive of both ends)', () => {
    const installer = { ...baseInstaller, leaveStart: '2026-10-05', leaveEnd: '2026-10-09' }
    expect(isInstallerOnLeave(installer, '2026-10-05')).toBe(true)
    expect(isInstallerOnLeave(installer, '2026-10-07')).toBe(true)
    expect(isInstallerOnLeave(installer, '2026-10-09')).toBe(true)
  })

  it('returns false for a date outside the leave range', () => {
    const installer = { ...baseInstaller, leaveStart: '2026-10-05', leaveEnd: '2026-10-09' }
    expect(isInstallerOnLeave(installer, '2026-10-04')).toBe(false)
    expect(isInstallerOnLeave(installer, '2026-10-10')).toBe(false)
  })

  it('returns false when the installer has no leave dates set', () => {
    expect(isInstallerOnLeave(baseInstaller, '2026-10-05')).toBe(false)
  })
})

describe('installerIneligibilityReason — leave check', () => {
  it('disqualifies an installer whose leave window covers the job date', () => {
    const installer = { ...baseInstaller, leaveStart: '2026-10-05', leaveEnd: '2026-10-09' }
    const reason = installerIneligibilityReason(installer, baseJob, '2026-10-07')
    expect(reason).toMatch(/on leave/i)
  })

  it('does not disqualify an installer for a date outside their leave window', () => {
    const installer = { ...baseInstaller, leaveStart: '2026-10-05', leaveEnd: '2026-10-09' }
    expect(installerIneligibilityReason(installer, baseJob, '2026-10-12')).toBeNull()
  })

  it('still checks state and rostering ahead of leave', () => {
    const installer = { ...baseInstaller, state: 'NSW', leaveStart: '2026-10-05', leaveEnd: '2026-10-09' }
    const reason = installerIneligibilityReason(installer, baseJob, '2026-10-07')
    expect(reason).toMatch(/based in NSW/)
  })
})
