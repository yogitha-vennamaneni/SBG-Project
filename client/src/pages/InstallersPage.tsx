import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Chip, Avatar, Stack, Button, TextField, InputAdornment,
  LinearProgress, CircularProgress, Alert, Dialog, DialogTitle, DialogContent,
  DialogActions,
} from '@mui/material'
import { Add, Bolt, ElectricCar, Roofing, Build, BatteryChargingFull, Search, Phone, Email } from '@mui/icons-material'
import { EventCalendar } from '@mui/x-scheduler'
import type {
  SchedulerEvent as MuiSchedulerEvent,
  SchedulerEventEditingStartEventDetails,
  SchedulerRenderableEventOccurrence,
} from '@mui/x-scheduler/models'
import { format } from 'date-fns'
import { enAU } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { installersApi, jobsApi } from '../services/api'
import { sbgColors } from '../theme'
import { JobType, Installer, Job } from '../types'
import { notImplemented } from '../utils/notImplemented'
import {
  jobToEvent, AssignDialog, EventDetailsTab, SchedulerDataContext,
  EVENT_MODEL_STRUCTURE, useJobWeather, useSchedulerEventsChange,
} from './SchedulerPage'

const SKILL_ICONS: Record<JobType, React.ReactNode> = {
  solar_installation: <Bolt sx={{ fontSize: 14 }} />,
  battery_installation: <BatteryChargingFull sx={{ fontSize: 14 }} />,
  ev_charger: <ElectricCar sx={{ fontSize: 14 }} />,
  roof_renovation: <Roofing sx={{ fontSize: 14 }} />,
  solar_adjustment: <Build sx={{ fontSize: 14 }} />,
  'Battery install': <BatteryChargingFull sx={{ fontSize: 14 }} />,
  'Solar + battery': <Bolt sx={{ fontSize: 14 }} />,
  'Battery upgrade': <BatteryChargingFull sx={{ fontSize: 14 }} />,
}

const ROLE_COLORS: Record<string, string> = {
  electrician: sbgColors.blue,
  installer: sbgColors.teal,
  supervisor: '#7c4dff',
}

export default function InstallersPage() {
  const [search, setSearch] = useState('')
  const [installers, setInstallers] = useState<Installer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewingInstaller, setViewingInstaller] = useState<Installer | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<{ start: Date } | null>(null)

  // `silent` skips the full-page spinner — used for background refreshes after
  // a schedule/unschedule mutation so the calendar doesn't blank out mid-interaction.
  const loadData = (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true)
    Promise.all([installersApi.list(), jobsApi.list()])
      .then(([installers, jobsRes]) => { setInstallers(installers); setJobs(jobsRes.data) })
      .catch(() => setError('Failed to load installers'))
      .finally(() => { if (!opts?.silent) setLoading(false) })
  }

  useEffect(() => loadData(), [])

  const { weatherByJobId, weatherRiskByJobId } = useJobWeather(jobs)
  const { handleEventsChange, rescheduleError, setRescheduleError } = useSchedulerEventsChange(jobs, setJobs, loadData)

  // Same pattern as the main scheduler: a click on an empty slot opens our own
  // AssignDialog (fixed to whichever installer's schedule is open) instead of
  // the built-in creation dialog; a click on an existing event lets the
  // built-in dialog open with its General tab swapped for EventDetailsTab.
  const handleEventEditingStart = useCallback((
    occurrence: SchedulerRenderableEventOccurrence,
    eventDetails: SchedulerEventEditingStartEventDetails
  ) => {
    if (eventDetails.reason === 'creation') {
      eventDetails.cancel()
      setSelectedSlot({ start: occurrence.displayTimezone.start.value })
    }
  }, [])

  // Stable per installer (not per render) — EventCalendar warns if an
  // uncontrolled default prop changes identity after mount.
  const defaultInstallerViewDate = useMemo(() => {
    if (!viewingInstaller) return new Date()
    const firstScheduled = jobs
      .filter(j => j.assignedInstallers.includes(viewingInstaller.id) && j.scheduledDate)
      .sort((a, b) => `${a.scheduledDate}${a.scheduledStartTime ?? ''}`.localeCompare(`${b.scheduledDate}${b.scheduledStartTime ?? ''}`))[0]
    return firstScheduled?.scheduledDate ? new Date(firstScheduled.scheduledDate) : new Date()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewingInstaller?.id])

  const filtered = installers.filter(i =>
    `${i.firstName} ${i.lastName} ${i.email} ${i.role} ${i.licenceNumber ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search installers…" size="small" sx={{ width: 320 }}
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />
          <Typography color="text.secondary">{filtered.length} active</Typography>
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={notImplemented}>Add Installer</Button>
      </Box>
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              {['Installer', 'Contact', 'Licence / REC', 'Skills', 'Weekly Utilisation', 'Today', ''].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(installer => {
              const assignedJobs = jobs.filter(j => j.assignedInstallers.includes(installer.id))
              const todayJobs = assignedJobs.filter(j => j.scheduledDate && new Date(j.scheduledDate).toLocaleString().split(',')[0] === new Date().toLocaleString().split(',')[0])
              const utilisation = Math.min((assignedJobs.length / 5) * 100, 100)
              return (
                <TableRow key={installer.id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{
                        width: 36, height: 36, fontSize: 14, fontWeight: 700,
                        bgcolor: ROLE_COLORS[installer.role] ?? sbgColors.blue,
                      }}>
                        {installer.firstName[0]}{installer.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {installer.firstName} {installer.lastName}
                        </Typography>
                        <Chip
                          label={installer.role}
                          size="small"
                          sx={{
                            bgcolor: `${ROLE_COLORS[installer.role]}18`,
                            color: ROLE_COLORS[installer.role],
                            fontWeight: 700, textTransform: 'capitalize', fontSize: 10, height: 18,
                          }}
                        />
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption">{installer.email}</Typography>
                      </Stack>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                        <Typography variant="caption">{installer.phone}</Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{installer.licenceNumber ?? '—'}</Typography>
                    {installer.recRegistration && (
                      <Typography variant="caption" color="text.secondary">REC: {installer.recRegistration}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, maxWidth: 220 }}>
                      {installer.skills.map(skill => (
                        <Chip
                          key={skill}
                          icon={<Box component="span">{SKILL_ICONS[skill]}</Box>}
                          label={skill.replace('_', ' ')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: 10, textTransform: 'capitalize' }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ minWidth: 120 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" color="text.secondary">{assignedJobs.length} jobs</Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate" value={utilisation}
                        sx={{
                          height: 6, borderRadius: 3, bgcolor: '#eee',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: utilisation > 80 ? '#f57c00' : sbgColors.blue,
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={todayJobs.length === 0 ? 'Available' : `${todayJobs.length} job${todayJobs.length > 1 ? 's' : ''}`}
                      size="small"
                      sx={{
                        bgcolor: todayJobs.length === 0 ? '#e8f5e9' : `${sbgColors.blue}18`,
                        color: todayJobs.length === 0 ? '#2e7d32' : sbgColors.blue,
                        fontSize: 10, fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Button size="small" variant="text" onClick={() => setViewingInstaller(installer)}>View Schedule</Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={!!viewingInstaller} onClose={() => setViewingInstaller(null)} maxWidth="lg" fullWidth>
        <DialogTitle fontWeight={700}>
          {viewingInstaller && `${viewingInstaller.firstName} ${viewingInstaller.lastName}'s Schedule`}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Click an empty slot to schedule a job • Click a job for details, or delete to unschedule it
          </Typography>
          {rescheduleError && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRescheduleError(null)}>
              {rescheduleError}
            </Alert>
          )}
          {viewingInstaller && (() => {
            const allEvents = jobs.map(job => jobToEvent(job, weatherRiskByJobId)).filter((e): e is MuiSchedulerEvent => e !== null)
            const resources = installers.map(i => ({ id: i.id, title: `${i.firstName} ${i.lastName}` }))
            // Resources double as the filter: hide every installer but the one
            // whose schedule was requested, rather than pre-filtering the events.
            const visibleResources = Object.fromEntries(installers.map(i => [i.id, i.id === viewingInstaller.id]))

            return (
              <Box sx={{ height: 650 }}>
                <SchedulerDataContext.Provider value={{ jobs, installers, weatherByJobId }}>
                  <EventCalendar<MuiSchedulerEvent, { id: string; title: string }>
                    key={viewingInstaller.id}
                    sx={{ height: '100%' }}
                    events={allEvents}
                    resources={resources}
                    visibleResources={visibleResources}
                    onEventsChange={handleEventsChange}
                    onEventEditingStart={handleEventEditingStart}
                    eventCreation={{ interaction: 'click', duration: 30 }}
                    areEventsResizable={false}
                    defaultView="day"
                    defaultVisibleDate={defaultInstallerViewDate}
                    viewConfig={{ week: { startTime: 6, endTime: 20 }, day: { startTime: 6, endTime: 20 } }}
                    dateLocale={enAU}
                    eventModelStructure={EVENT_MODEL_STRUCTURE}
                    slots={{ eventDialogGeneralTab: EventDetailsTab }}
                  />
                </SchedulerDataContext.Provider>
              </Box>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViewingInstaller(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <AssignDialog
        slot={selectedSlot}
        jobs={jobs}
        installers={installers}
        fixedInstaller={viewingInstaller ?? undefined}
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
