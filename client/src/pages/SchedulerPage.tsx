import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react'
import { EventCalendar } from '@mui/x-scheduler'
import type {
  SchedulerEvent as MuiSchedulerEvent,
  SchedulerEventColor,
  SchedulerEventEditingStartEventDetails,
  SchedulerEventModelStructure,
  SchedulerRenderableEventOccurrence,
} from '@mui/x-scheduler/models'
import { useEventDialogOccurrence } from '@mui/x-scheduler/event-dialog'
import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import {
  Box, Card, CardContent, Typography, Chip, Button,
  Grid, Avatar, Stack, Divider, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl,
  InputLabel, Alert, CircularProgress, Checkbox, ListItemText, Tooltip,
} from '@mui/material'
import { Warning, WbSunny } from '@mui/icons-material'
import { Job, Installer, WeatherForecast } from '../types'
import { jobsApi, installersApi, weatherApi } from '../services/api'
import { sbgColors } from '../theme'
import { installerIneligibilityReason } from '../utils/installerEligibility'

const JOB_STATUS_COLORS: Record<string, string> = {
  scheduled: sbgColors.blue,
  in_progress: '#f57c00',
  completed: '#2e7d32',
  deposit_paid: sbgColors.teal,
}

// MUI X Scheduler only accepts named palette colors, not arbitrary hex —
// map each job status to the closest one to keep the legend meaningful.
const JOB_STATUS_EVENT_COLOR: Record<string, SchedulerEventColor> = {
  scheduled: 'blue',
  in_progress: 'orange',
  completed: 'green',
  deposit_paid: 'teal',
}

// No setter for `title` — the built-in dialog's title field (rendered above the
// `eventDialogGeneralTab` slot, so it can't be swapped out there) becomes read-only.
// Every other property keeps its default get/set so drag-to-reschedule etc. still work.
export const EVENT_MODEL_STRUCTURE: SchedulerEventModelStructure<MuiSchedulerEvent> = {
  title: { getter: event => event.title },
}

// `riskByJobId` carries a medium/high-risk forecast day for jobs whose scheduled
// date falls in one — folded straight into the event's title/description so the
// alert rides along with the event itself instead of a separate summary card.
export function jobToEvent(job: Job, riskByJobId?: Map<string, WeatherForecast>): MuiSchedulerEvent | null {
  if (!job.scheduledDate) return null
  const [h, m] = (job.scheduledStartTime ?? '08:00').split(':').map(Number)
  const start = new Date(job.scheduledDate)
  start.setHours(h, m, 0, 0)
  const end = new Date(start.getTime() + job.estimatedDuration * 60_000)
  const risk = riskByJobId?.get(job.id)
  return {
    id: job.id,
    title: `${risk ? '⚠️ ' : ''}${job.customer?.firstName} ${job.customer?.lastName} — ${job.jobType.replace('_', ' ')}`,
    description: risk
      ? `${job.address.suburb} · ${job.estimatedDuration} mins · ${risk.risk} weather risk — ${risk.advisories[0] ?? risk.condition}`
      : `${job.address.suburb} · ${job.estimatedDuration} mins`,
    start: start.toISOString(),
    end: end.toISOString(),
    color: JOB_STATUS_EVENT_COLOR[job.status] ?? 'grey',
    resource: job.assignedInstallers,
  }
}

// Backs the event-details dialog's custom tab (see EventDetailsTab below). A
// context rather than closure props because the tab component must be a
// stable reference passed to EventCalendar's `slots` — recreating it every
// render would remount the dialog content — while still reading live data.
export const SchedulerDataContext = createContext<{
  jobs: Job[]
  installers: Installer[]
  weatherByJobId: Map<string, WeatherForecast>
}>({ jobs: [], installers: [], weatherByJobId: new Map() })

// Rendered inside the built-in event-details dialog (see `slots.eventDialogGeneralTab`
// below) in place of the default date/time + description form — full job, installer,
// place and weather info for whichever event was clicked, read-only. Shared with the
// per-installer schedule dialog on the Installers page so both show identical details.
export function EventDetailsTab() {
  const occurrence = useEventDialogOccurrence()
  const { jobs, installers, weatherByJobId } = useContext(SchedulerDataContext)
  const job = jobs.find(j => j.id === occurrence.id)
  if (!job) return null

  const assigned = installers.filter(i => job.assignedInstallers.includes(i.id))
  const weather = weatherByJobId.get(job.id)

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Job</Typography>
        <Typography variant="body2">
          {job.customer?.firstName} {job.customer?.lastName} — {job.jobType.replace('_', ' ')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {job.estimatedDuration} mins · <span style={{ textTransform: 'capitalize' }}>{job.status.replace('_', ' ')}</span>
        </Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="overline" color="text.secondary">Place</Typography>
        <Typography variant="body2">
          {job.address.street}, {job.address.suburb} {job.address.state} {job.address.postcode}
        </Typography>
      </Box>
      <Divider />
      <Box>
        <Typography variant="overline" color="text.secondary">Installers</Typography>
        {assigned.length === 0 ? (
          <Typography variant="body2" color="text.secondary">Unassigned</Typography>
        ) : assigned.map(i => (
          <Typography key={i.id} variant="body2">{i.firstName} {i.lastName} — {i.role}</Typography>
        ))}
      </Box>
      <Divider />
      <Box>
        <Typography variant="overline" color="text.secondary">Weather</Typography>
        {weather ? (
          <>
            <Chip
              label={`${weather.risk} risk`}
              size="small"
              sx={{
                mb: 0.5, fontWeight: 700, textTransform: 'capitalize',
                bgcolor: weather.risk === 'high' ? '#ffcdd2' : weather.risk === 'medium' ? '#ffe0b2' : '#e0f2f1',
                color: weather.risk === 'high' ? '#c62828' : weather.risk === 'medium' ? '#e65100' : '#00695c',
              }}
            />
            <Typography variant="body2">
              {weather.condition}, {weather.tempMaxC}°C, wind {weather.windSpeedKmh} km/h, rain chance {weather.rainChancePct}%
            </Typography>
            {weather.advisories.map(a => (
              <Typography key={a} variant="body2" color="warning.main">⚠ {a}</Typography>
            ))}
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No forecast available for this date.</Typography>
        )}
      </Box>
    </Stack>
  )
}

interface ScheduleSlot {
  start: Date
}

interface AssignDialogProps {
  slot: ScheduleSlot | null
  jobs: Job[]
  installers: Installer[]
  // When set, the dialog schedules for this one installer instead of offering
  // an installer picker — used by the per-installer schedule dialog on the
  // Installers page. The job list still shows every unscheduled job, but
  // disables ones this installer isn't eligible for (wrong state, not
  // rostered that day), same reasons the general picker disables installers for.
  fixedInstaller?: Installer
  onClose: () => void
  onConfirm: (installerIds: string[], jobId: string) => Promise<string | null>
}

export function AssignDialog({ slot, jobs, installers, fixedInstaller, onClose, onConfirm }: AssignDialogProps) {
  const [selectedJob, setSelectedJob] = useState('')
  const [selectedInstallers, setSelectedInstallers] = useState<string[]>([])
  const [conflictingInstallerIds, setConflictingInstallerIds] = useState<Set<string>>(new Set())
  const [jobWeather, setJobWeather] = useState<WeatherForecast | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const unscheduledJobs = jobs.filter(j => !j.scheduledDate && j.assignedInstallers.length === 0)
  const selectedJobObj = jobs.find(j => j.id === selectedJob) ?? null
  const slotDate = slot ? format(slot.start, 'yyyy-MM-dd') : null
  const fixedInstallerReason = fixedInstaller && selectedJobObj && slotDate
    ? installerIneligibilityReason(fixedInstaller, selectedJobObj, slotDate)
    : null

  useEffect(() => {
    setSelectedJob('')
    setSelectedInstallers([])
    setConflictingInstallerIds(new Set())
    setError(null)
  }, [slot])

  // Weather report for the job's address on the slot's date, once a job is picked.
  useEffect(() => {
    setJobWeather(null)
    if (!selectedJobObj || !slotDate) return
    let cancelled = false
    weatherApi.forecast(selectedJobObj.address.suburb, selectedJobObj.address.postcode)
      .then(forecast => {
        if (cancelled) return
        setJobWeather(forecast.find(f => f.date === slotDate) ?? null)
      })
      .catch(() => { if (!cancelled) setJobWeather(null) })
    return () => { cancelled = true }
  }, [selectedJobObj, slotDate])

  // Drop any selected installer who becomes ineligible (wrong state, not
  // rostered that day) once the picked job or slot changes — same idea as
  // the busy-filter below, but synchronous since it needs no API round trip.
  useEffect(() => {
    if (fixedInstaller) return
    if (!selectedJobObj || !slotDate) return
    setSelectedInstallers(prev => prev.filter(iid => {
      const installer = installers.find(i => i.id === iid)
      return installer ? !installerIneligibilityReason(installer, selectedJobObj, slotDate) : true
    }))
  }, [selectedJobObj, slotDate, installers, fixedInstaller])

  // Re-check installer availability whenever the picked job (which carries its
  // own duration) or the slot changes, so busy installers get disabled before submit.
  // Fixed-installer mode only needs to check that one installer.
  useEffect(() => {
    const checkIds = fixedInstaller ? [fixedInstaller.id] : installers.map(i => i.id)
    if (!slot || !selectedJobObj || checkIds.length === 0) {
      setConflictingInstallerIds(new Set())
      return
    }
    let cancelled = false
    jobsApi.checkConflicts({
      installerIds: checkIds,
      date: format(slot.start, 'yyyy-MM-dd'),
      startTime: format(slot.start, 'HH:mm'),
      durationMinutes: selectedJobObj.estimatedDuration,
      excludeJobId: selectedJobObj.id,
    }).then(result => {
      if (cancelled) return
      const busy = new Set<string>()
      for (const cj of result.conflictingJobs ?? []) {
        for (const iid of cj.assignedInstallers ?? []) busy.add(iid)
      }
      setConflictingInstallerIds(busy)
      if (!fixedInstaller) setSelectedInstallers(prev => prev.filter(iid => !busy.has(iid)))
    }).catch(() => { if (!cancelled) setConflictingInstallerIds(new Set()) })
    return () => { cancelled = true }
  }, [slot, selectedJob, installers, jobs, fixedInstaller])

  return (
    <Dialog open={!!slot} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Schedule a Job</DialogTitle>
      <DialogContent>
        {slot && (
          <Box sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              Slot: <strong>{format(slot.start, 'EEEE d MMM yyyy, HH:mm')}</strong>
            </Alert>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Select Job</InputLabel>
              <Select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} label="Select Job">
                {unscheduledJobs.map(j => {
                  const reason = fixedInstaller && slotDate
                    ? installerIneligibilityReason(fixedInstaller, j, slotDate)
                    : null
                  return (
                    <MenuItem key={j.id} value={j.id} disabled={!!reason}>
                      {j.customer?.firstName} {j.customer?.lastName} — {j.jobType.replace('_', ' ')}
                      {reason && ` (${reason})`}
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
            {selectedJobObj && (
              jobWeather ? (
                <Alert
                  severity={jobWeather.risk === 'high' ? 'error' : jobWeather.risk === 'medium' ? 'warning' : 'info'}
                  icon={<WbSunny fontSize="inherit" />}
                  sx={{ mb: 2 }}
                >
                  <strong>{selectedJobObj.address.suburb}, {selectedJobObj.address.postcode}</strong>
                  {' '}on {format(slot!.start, 'EEE d MMM')}: {jobWeather.condition}, {jobWeather.tempMaxC}°C,
                  {' '}wind {jobWeather.windSpeedKmh} km/h, rain chance {jobWeather.rainChancePct}%
                  {jobWeather.advisories.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>{jobWeather.advisories.join(' · ')}</Box>
                  )}
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No forecast available for {selectedJobObj.address.suburb} on this date (beyond the 5-day forecast window).
                </Alert>
              )
            )}
            {fixedInstaller ? (
              <Alert
                severity={fixedInstallerReason || conflictingInstallerIds.has(fixedInstaller.id) ? 'warning' : 'info'}
              >
                Installer: <strong>{fixedInstaller.firstName} {fixedInstaller.lastName}</strong>
                {fixedInstallerReason && ` — ${fixedInstallerReason}`}
                {!fixedInstallerReason && conflictingInstallerIds.has(fixedInstaller.id) && ' — already assigned at this time'}
              </Alert>
            ) : (
              <FormControl fullWidth>
                <InputLabel>Assign Installers</InputLabel>
                <Select
                  multiple value={selectedInstallers}
                  onChange={e => setSelectedInstallers(e.target.value as string[])}
                  label="Assign Installers"
                  renderValue={selected =>
                    installers
                      .filter(i => selected.includes(i.id))
                      .map(i => `${i.firstName} ${i.lastName}`)
                      .join(', ')
                  }
                >
                  {installers.map(i => {
                    const isBusy = conflictingInstallerIds.has(i.id)
                    const ineligibleReason = selectedJobObj && slotDate
                      ? installerIneligibilityReason(i, selectedJobObj, slotDate)
                      : null
                    const reasonText = isBusy
                      ? ' (already assigned at this time)'
                      : ineligibleReason ? ` (${ineligibleReason})` : ''
                    const base = i.homeBase ? ` — ${i.homeBase}, ${i.state}` : ''
                    return (
                      <MenuItem key={i.id} value={i.id} disabled={isBusy || !!ineligibleReason}>
                        <Checkbox checked={selectedInstallers.includes(i.id)} size="small" />
                        <ListItemText
                          primary={`${i.firstName} ${i.lastName} — ${i.role}${base}${reasonText}`}
                        />
                      </MenuItem>
                    )
                  })}
                </Select>
              </FormControl>
            )}
            {/* {conflictingInstallerIds.size > 0 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                {conflictingInstallerIds.size === 1 ? 'An installer is' : 'Some installers are'} already assigned to another job at this date and time, and can't be selected.
              </Alert>
            )} */}
            {/* {selectedJobObj && slotDate && installers.some(i => installerIneligibilityReason(i, selectedJobObj, slotDate)) && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Some installers aren't rostered for this date or don't service this state, and can't be selected.
              </Alert>
            )} */}
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={
            !selectedJob || submitting ||
            (fixedInstaller
              ? !!fixedInstallerReason || conflictingInstallerIds.has(fixedInstaller.id)
              : selectedInstallers.length === 0)
          }
          onClick={async () => {
            setSubmitting(true)
            const errMsg = await onConfirm(fixedInstaller ? [fixedInstaller.id] : selectedInstallers, selectedJob)
            setSubmitting(false)
            if (errMsg) setError(errMsg)
            else onClose()
          }}
        >
          Schedule
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// Fetches the 5-day forecast for every active scheduled job's location and
// exposes it both per-job (any risk) and narrowed to medium/high risk. Shared
// by the main scheduler and the per-installer schedule dialog on the
// Installers page so both surface identical weather info.
export function useJobWeather(jobs: Job[]) {
  // Every active job's forecast, whatever its risk — the event-details panel
  // shows this regardless of risk; `weatherRisks` below narrows it to the
  // medium/high subset that drives alerts (event ⚠, roster chips, banner).
  const [jobWeather, setJobWeather] = useState<{ job: Job; forecast: WeatherForecast }[]>([])

  // Check the forecast against every still-active scheduled job (whatever falls
  // in the API's 5-day window, not just today, so every visible calendar event
  // can carry its own alert) — one forecast request per unique suburb/postcode,
  // not per job.
  useEffect(() => {
    const activeJobs = jobs.filter(j => j.scheduledDate && j.status !== 'completed' && j.status !== 'paid')
    if (activeJobs.length === 0) { setJobWeather([]); return }

    const locations = new Map<string, { suburb: string; postcode: string }>()
    for (const j of activeJobs) {
      const key = `${j.address.suburb}|${j.address.postcode}`
      if (!locations.has(key)) locations.set(key, { suburb: j.address.suburb, postcode: j.address.postcode })
    }

    let cancelled = false
    Promise.all(
      Array.from(locations.entries()).map(([key, loc]) =>
        weatherApi.forecast(loc.suburb, loc.postcode)
          .then(forecast => [key, forecast] as const)
          .catch(() => [key, [] as WeatherForecast[]] as const)
      )
    ).then(results => {
      if (cancelled) return
      const forecastByLocation = new Map(results)
      const pairs = activeJobs
        .map(job => {
          const key = `${job.address.suburb}|${job.address.postcode}`
          const date = job.scheduledDate!.slice(0, 10)
          const day = forecastByLocation.get(key)?.find(f => f.date === date)
          return day ? { job, forecast: day } : null
        })
        .filter((r): r is { job: Job; forecast: WeatherForecast } => r !== null)
      setJobWeather(pairs)
    })
    return () => { cancelled = true }
  }, [jobs])

  // Medium/high-risk subset — this is what actually raises an alert.
  const weatherRisks = useMemo(() => jobWeather.filter(r => r.forecast.risk !== 'low'), [jobWeather])

  // Just today's risks — the banner headline counts and reports on today only,
  // even though `weatherRisks` above spans the full 5-day window.
  const todayWeatherRisks = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd')
    return weatherRisks.filter(r => r.forecast.date === today)
  }, [weatherRisks])

  // Worst-risk day first (high before medium), then soonest — drives the headline advisory.
  const worstWeatherRisk = useMemo(() => {
    if (todayWeatherRisks.length === 0) return null
    return [...todayWeatherRisks].sort((a, b) => {
      if (a.forecast.risk !== b.forecast.risk) return a.forecast.risk === 'high' ? -1 : 1
      return a.forecast.date.localeCompare(b.forecast.date)
    })[0]
  }, [todayWeatherRisks])

  // Per-job lookup so the roster/events can flag exactly which jobs are at risk.
  const weatherRiskByJobId = useMemo(
    () => new Map(weatherRisks.map(r => [r.job.id, r.forecast])),
    [weatherRisks]
  )

  // Full per-job forecast (any risk level) — feeds the event-details panel.
  const weatherByJobId = useMemo(
    () => new Map(jobWeather.map(r => [r.job.id, r.forecast])),
    [jobWeather]
  )

  return { jobWeather, weatherRisks, todayWeatherRisks, worstWeatherRisk, weatherRiskByJobId, weatherByJobId }
}

// Wires up the calendar's onEventsChange: a job whose event dropped out of
// `value` was removed via the dialog's Delete button (unassigned rather than
// deleted, since the calendar only ever reflects scheduled jobs); anything
// else just has its start time diffed against the current job and, if moved,
// reassigned to the new slot. Shared by the main scheduler and the
// per-installer schedule dialog on the Installers page.
export function useSchedulerEventsChange(
  jobs: Job[],
  setJobs: React.Dispatch<React.SetStateAction<Job[]>>,
  loadData: (opts?: { silent?: boolean }) => void
) {
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  const handleEventsChange = useCallback((value: MuiSchedulerEvent[]) => {
    const nextIds = new Set(value.map(e => e.id))
    for (const job of jobs) {
      if (!job.scheduledDate || nextIds.has(job.id)) continue

      const prevDate = job.scheduledDate
      const prevTime = job.scheduledStartTime
      const prevInstallers = job.assignedInstallers
      setRescheduleError(null)
      setJobs(prev => prev.map(j =>
        j.id === job.id ? { ...j, scheduledDate: undefined, scheduledStartTime: undefined, assignedInstallers: [] } : j
      ))

      jobsApi.unassign(job.id)
        .then(() => loadData({ silent: true }))
        .catch((err: any) => {
          setRescheduleError(err?.response?.data?.error ?? 'Failed to remove job from schedule')
          setJobs(prev => prev.map(j =>
            j.id === job.id ? { ...j, scheduledDate: prevDate, scheduledStartTime: prevTime, assignedInstallers: prevInstallers } : j
          ))
        })
    }

    for (const updated of value) {
      const job = jobs.find(j => j.id === updated.id)
      if (!job) continue
      const newStart = new Date(updated.start)
      const newDate = format(newStart, 'yyyy-MM-dd')
      const newTime = format(newStart, 'HH:mm')
      if (job.scheduledDate === newDate && job.scheduledStartTime === newTime) continue

      const prevDate = job.scheduledDate
      const prevTime = job.scheduledStartTime
      setRescheduleError(null)
      // Move the event immediately rather than waiting on the round-trip, so the
      // calendar reflects the drop right away instead of snapping back and forth.
      setJobs(prev => prev.map(j =>
        j.id === job.id ? { ...j, scheduledDate: newDate, scheduledStartTime: newTime } : j
      ))

      jobsApi.assign(job.id, job.assignedInstallers, newDate, newTime)
        .then(() => loadData({ silent: true }))
        .catch((err: any) => {
          setRescheduleError(err?.response?.data?.error ?? 'Failed to reschedule job')
          setJobs(prev => prev.map(j =>
            j.id === job.id ? { ...j, scheduledDate: prevDate, scheduledStartTime: prevTime } : j
          ))
        })
    }
  }, [jobs, setJobs, loadData])

  return { handleEventsChange, rescheduleError, setRescheduleError }
}

export default function SchedulerPage() {
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [installers, setInstallers] = useState<Installer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // `silent` skips the full-page spinner — used for background refreshes after
  // a mutation (assign/drag) so the calendar doesn't blank out mid-interaction.
  const loadData = (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    Promise.all([jobsApi.list(), installersApi.list()])
      .then(([jobsRes, installers]) => { setJobs(jobsRes.data); setInstallers(installers) })
      .catch(() => setError('Failed to load scheduler data'))
      .finally(() => { if (!opts?.silent) setLoading(false) })
  }

  useEffect(() => loadData(), [])

  const { todayWeatherRisks, worstWeatherRisk, weatherRiskByJobId, weatherByJobId } = useJobWeather(jobs)
  const { handleEventsChange, rescheduleError, setRescheduleError } = useSchedulerEventsChange(jobs, setJobs, loadData)

  // Stable across re-renders — EventCalendar warns if an uncontrolled default
  // prop changes identity after mount, which a fresh `new Date()` would trigger.
  const [defaultVisibleDate] = useState(() => new Date())

  const events = useMemo(
    () => jobs.map(job => jobToEvent(job, weatherRiskByJobId)).filter((e): e is MuiSchedulerEvent => e !== null),
    [jobs, weatherRiskByJobId]
  )

  // Powers the calendar's side-panel resource list — checking/unchecking an
  // installer there filters the events shown, same mechanism as the
  // per-installer schedule dialog on the Installers page.
  const resources = useMemo(
    () => installers.map(i => ({ id: i.id, title: `${i.firstName} ${i.lastName}` })),
    [installers]
  )

  // Fires right before the built-in create/edit dialog would open. For a click
  // on an empty slot (reason "creation") we cancel it and open our own
  // AssignDialog instead, so scheduling stays tied to picking an existing
  // unscheduled job. For a click on an existing event we let the built-in
  // dialog open — its General tab is swapped for EventDetailsTab (see `slots`
  // below) showing job/installer/place/weather details.
  const handleEventEditingStart = useCallback((
    occurrence: SchedulerRenderableEventOccurrence,
    eventDetails: SchedulerEventEditingStartEventDetails
  ) => {
    if (eventDetails.reason === 'creation') {
      eventDetails.cancel()
      setSelectedSlot({ start: occurrence.displayTimezone.start.value })
    }
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{display: 'flex', alignItems: 'flex-end', gap: 1}}>
          <Typography variant="h5" fontWeight={700}>Job Scheduler</Typography>
          <Typography color="text.secondary">• Drag to reschedule • Click to assign</Typography>
          {rescheduleError && (
            <Alert severity="error" sx={{ mt: 1 }} onClose={() => setRescheduleError(null)}>
              {rescheduleError}
            </Alert>
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          {Object.entries(JOB_STATUS_COLORS).map(([status, color]) => (
            <Chip key={status} label={status.replace('_', ' ')}
              size="small"
              sx={{ bgcolor: `${color}18`, color, fontWeight: 700, textTransform: 'capitalize' }}
            />
          ))}
        </Stack>
      </Box>

      {/* Weather alert — sits at the top of the schedule. Each affected
          event already carries its own ⚠ in the calendar, and clicking an
          event opens its full details (job, installers, place, weather);
          this is just a one-line roll-up, not a card. */}
      {worstWeatherRisk && (
        <Alert
          severity={worstWeatherRisk.forecast.risk === 'high' ? 'error' : 'warning'}
          icon={<WbSunny fontSize="inherit" />}
          sx={{ mt: 1, mb: 1 }}
        >
          <strong>Today's job weather forecast:</strong> {todayWeatherRisks.length} job{todayWeatherRisks.length === 1 ? '' : 's'} at weather risk — worst: {worstWeatherRisk.forecast.condition} in {worstWeatherRisk.job.address.suburb} ({worstWeatherRisk.forecast.advisories[0]})
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Calendar */}
        <Grid size={{ xs: 12, lg: 9 }}>
          <Card sx={{ p: 1 }}>
            <Box sx={{ height: 700 }}>
              <SchedulerDataContext.Provider value={{ jobs, installers, weatherByJobId }}>
                <EventCalendar<MuiSchedulerEvent, { id: string; title: string }>
                  sx={{ height: '100%' }}
                  events={events}
                  resources={resources}
                  onEventsChange={handleEventsChange}
                  onEventEditingStart={handleEventEditingStart}
                  eventCreation={{ interaction: 'click', duration: 30 }}
                  areEventsResizable={false}
                  defaultView="day"
                  defaultVisibleDate={defaultVisibleDate}
                  defaultPreferences={{ weekStartsOn: 1, isSidePanelOpen: true }}
                  viewConfig={{ week: { startTime: 6, endTime: 20 }, day: { startTime: 6, endTime: 20 } }}
                  dateLocale={enAU}
                  eventModelStructure={EVENT_MODEL_STRUCTURE}
                  slots={{ eventDialogGeneralTab: EventDetailsTab }}
                />
              </SchedulerDataContext.Provider>
            </Box>
          </Card>
        </Grid>

        {/* Installer sidebar */}
        <Grid size={{ xs: 12, lg: 3 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2, height: { lg: 700 } }}>
          <Card sx={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
            <CardContent sx={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
              <Typography variant="h6" fontWeight={700} mb={2}>Today's Roster</Typography>
              {installers.map(installer => {
                const todayJobs = jobs.filter(
                  j => j.assignedInstallers.includes(installer.id) && j.scheduledDate &&
                    new Date(j.scheduledDate).toLocaleString().split(',')[0] === new Date().toLocaleString().split(',')[0]
                )
                return (
                  <Box key={installer.id} sx={{ mb: 2, pb: 2, borderBottom: '1px solid #eee' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Avatar sx={{ width: 32, height: 32, bgcolor: sbgColors.blue, fontSize: 12 }}>
                        {installer.firstName[0]}{installer.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {installer.firstName} {installer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {installer.role}
                        </Typography>
                      </Box>
                    </Box>
                    {todayJobs.length === 0 ? (
                      <Chip label="Available" size="small" sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontSize: 10 }} />
                    ) : (
                      todayJobs.map(j => {
                        const risk = weatherRiskByJobId.get(j.id)
                        const chip = (
                          <Chip
                            key={j.id}
                            icon={risk ? <Warning sx={{ fontSize: 12 }} /> : undefined}
                            label={`${j.scheduledStartTime} · ${j.address.suburb}`}
                            size="small"
                            sx={{
                              mr: 0.5, mb: 0.5, fontSize: 10,
                              bgcolor: risk ? '#ff980018' : `${sbgColors.blue}18`,
                              color: risk ? '#e65100' : sbgColors.blue,
                            }}
                          />
                        )
                        return risk
                          ? <Tooltip key={j.id} title={`${risk.risk} weather risk — ${risk.advisories.join('; ')}`}>{chip}</Tooltip>
                          : chip
                      })
                    )}
                  </Box>
                )
              })}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <AssignDialog
        slot={selectedSlot}
        jobs={jobs}
        installers={installers}
        onClose={() => setSelectedSlot(null)}
        onConfirm={async (installerIds, jobId) => {
          if (!selectedSlot) return 'No slot selected'
          try {
            await jobsApi.assign(jobId, installerIds, format(selectedSlot.start, 'yyyy-MM-dd'), format(selectedSlot.start, 'HH:mm'))
            loadData({ silent: true })
            return null
          } catch (err: any) {
            return err?.response?.data?.error ?? 'Failed to assign job'
          }
        }}
      />
    </Box>
  )
}
