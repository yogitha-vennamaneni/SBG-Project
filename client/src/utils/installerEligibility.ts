import { Installer, Job } from '../types'

const DAY_ABBREVIATIONS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Parsed as a local date (not UTC) so the day-of-week lines up with what the
// user picked in the date field, regardless of their timezone offset.
export function dayAbbreviation(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return DAY_ABBREVIATIONS[new Date(y, m - 1, d).getDay()]
}

// leaveStart/leaveEnd are ISO dates (YYYY-MM-DD), inclusive on both ends, so a
// plain string comparison against another ISO date is safe here.
export function isInstallerOnLeave(installer: Installer, date: string): boolean {
  return !!(installer.leaveStart && installer.leaveEnd && date >= installer.leaveStart && date <= installer.leaveEnd)
}

// Installers don't cross state lines, aren't rostered on every day, and may be
// on leave — surface all three as reasons the picker disables them, same as a
// time conflict.
export function installerIneligibilityReason(installer: Installer, job: Job, date: string): string | null {
  if (installer.state && job.address.state && installer.state !== job.address.state) {
    return `based in ${installer.state}, job is in ${job.address.state}`
  }
  if (installer.workingDays && installer.workingDays.length > 0) {
    const day = dayAbbreviation(date)
    if (!installer.workingDays.includes(day)) {
      return `not rostered on ${day}`
    }
  }
  if (isInstallerOnLeave(installer, date)) {
    return `on leave ${installer.leaveStart} to ${installer.leaveEnd}`
  }
  return null
}
