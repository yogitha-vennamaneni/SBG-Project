import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button,
  Stack, Stepper, Step, StepLabel, Divider, Avatar,
  Tab, Tabs, Alert, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Select, MenuItem, FormControl,
  InputLabel, TextField, Checkbox, ListItemText,
} from '@mui/material'
import {
  ArrowBack, CameraAlt, Receipt, Description, CheckCircle,
  Schedule, Engineering, LocationOn, Download, PersonAdd, WbSunny,
} from '@mui/icons-material'
import { jobsApi, installersApi, weatherApi } from '../services/api'
import { Job, Installer, WeatherForecast } from '../types'
import { sbgColors } from '../theme'
import PhotoUploadPanel from '../components/PhotoUploadPanel'
import { notImplemented } from '../utils/notImplemented'
import { installerIneligibilityReason } from '../utils/installerEligibility'

const JOB_STAGES = [
  { label: 'Enquiry', key: 'enquiry' },
  { label: 'Quoted', key: 'quoted' },
  { label: 'Accepted', key: 'quote_accepted' },
  { label: 'Deposit Paid', key: 'deposit_paid' },
  { label: 'Scheduled', key: 'scheduled' },
  { label: 'In Progress', key: 'in_progress' },
  { label: 'Completed', key: 'completed' },
  { label: 'Paid', key: 'paid' },
]

const STATUS_COLORS: Record<string, string> = {
  enquiry: '#9e9e9e', quoted: '#1976d2', quote_accepted: sbgColors.teal,
  deposit_paid: sbgColors.teal, scheduled: sbgColors.blue,
  in_progress: '#f57c00', completed: '#2e7d32', paid: '#2e7d32',
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [weatherAdvisory, setWeatherAdvisory] = useState<WeatherForecast | null>(null)

  const [availableInstallers, setAvailableInstallers] = useState<Installer[]>([])
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignInstallerIds, setAssignInstallerIds] = useState<string[]>([])
  const [assignDate, setAssignDate] = useState('')
  const [assignTime, setAssignTime] = useState('08:00')
  const [assigning, setAssigning] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [conflictingInstallerIds, setConflictingInstallerIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!id) return
    setLoading(true)
    jobsApi.get(id)
      .then(setJob)
      .catch(() => setError('Failed to load job'))
      .finally(() => setLoading(false))
  }, [id])

  // Show today's forecast for the job site.
  useEffect(() => {
    setWeatherAdvisory(null)
    if (!job) return
    let cancelled = false
    weatherApi.forecast(job.address.suburb, job.address.postcode)
      .then(forecast => {
        if (cancelled) return
        const forecastDay = job.scheduledDate ? new Date(job.scheduledDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10)
        const day = forecast.find(f => f.date === forecastDay)
        setWeatherAdvisory(day ?? null)
      })
      .catch(() => { if (!cancelled) setWeatherAdvisory(null) })
    return () => { cancelled = true }
  }, [job?.id, job?.scheduledDate, job?.status, job?.address.suburb, job?.address.postcode])

  const updateStatus = async (status: Job['status']) => {
    if (!id) return
    setUpdating(true)
    try {
      const updated = await jobsApi.updateStatus(id, status)
      setJob(updated)
    } catch {
      setError('Failed to update job status')
    } finally {
      setUpdating(false)
    }
  }

  const openAssignDialog = () => {
    if (!job) return
    installersApi.list().then(setAvailableInstallers).catch(() => setAvailableInstallers([]))
    setAssignInstallerIds([])
    setAssignDate(job.scheduledDate ?? new Date().toLocaleString().split(',')[0])
    setAssignTime(job.scheduledStartTime ?? '08:00')
    setAssignError(null)
    setConflictingInstallerIds(new Set())
    setAssignOpen(true)
  }

  // Whenever the date/time or installer list changes while the dialog is open,
  // re-check which installers are already booked in that window so the picker
  // can disable them. The summary warning only fires if a *selected* installer
  // turns out to be one of them (see selectedHasConflict) — otherwise it would
  // fire on every open just because someone, somewhere, is busy that day.
  useEffect(() => {
    if (!assignOpen || !job || !assignDate || availableInstallers.length === 0) {
      setConflictingInstallerIds(new Set())
      return
    }
    let cancelled = false
    jobsApi.checkConflicts({
      installerIds: availableInstallers.map(i => i.id),
      date: assignDate,
      startTime: assignTime,
      durationMinutes: job.estimatedDuration,
      excludeJobId: job.id,
    }).then(result => {
      if (cancelled) return
      const busy = new Set<string>()
      for (const cj of result.conflictingJobs ?? []) {
        for (const iid of cj.assignedInstallers ?? []) busy.add(iid)
      }
      setConflictingInstallerIds(busy)
    }).catch(() => { if (!cancelled) setConflictingInstallerIds(new Set()) })
    return () => { cancelled = true }
  }, [assignOpen, assignDate, assignTime, availableInstallers, job])

  const confirmAssign = async () => {
    if (!id || assignInstallerIds.length === 0 || !assignDate) return
    setAssigning(true)
    setAssignError(null)
    try {
      const updated = await jobsApi.assign(id, assignInstallerIds, assignDate, assignTime)
      setJob(updated)
      setAssignOpen(false)
    } catch (err: any) {
      setAssignError(err?.response?.data?.error ?? 'Failed to assign installer')
    } finally {
      setAssigning(false)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error || !job) return <Alert severity="error">{error ?? 'Job not found'}</Alert>

  const installers = job.installers ?? []
  const activeStep = JOB_STAGES.findIndex(s => s.key === job.status)
  const scheduledStep = JOB_STAGES.findIndex(s => s.key === 'scheduled')
  const isNotYetScheduled = activeStep < scheduledStep
  const selectedHasConflict = assignInstallerIds.some(iid => conflictingInstallerIds.has(iid))
  const selectedHasIneligible = assignDate
    ? assignInstallerIds.some(iid => {
        const installer = availableInstallers.find(i => i.id === iid)
        return installer ? !!installerIneligibilityReason(installer, job, assignDate) : false
      })
    : false
  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>
        Back
      </Button>

      {/* Header */}
      <Card sx={{ mb: 3, background: `linear-gradient(135deg, ${sbgColors.blue} 0%, #0000cc 100%)` }}>
        <CardContent sx={{ color: '#fff' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.75, letterSpacing: 1 }}>
                JOB #{job.id.toUpperCase()}
              </Typography>
              <Typography variant="h5" fontWeight={800} mt={0.5}>
                {job.customer?.firstName} {job.customer?.lastName}
              </Typography>
              <Stack direction="row" spacing={1} mt={1} flexWrap="wrap">
                <Chip
                  label={job.jobType.replace('_', ' ')}
                  size="small"
                  sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 700, textTransform: 'capitalize' }}
                />
                <Chip
                  label={job.status.replace('_', ' ')}
                  size="small"
                  sx={{ bgcolor: sbgColors.yellow, color: sbgColors.dark, fontWeight: 700, textTransform: 'capitalize' }}
                />
                {job.weatherRisk === 'high' && (
                  <Chip label="⚠ Weather Risk" size="small" sx={{ bgcolor: '#ff980040', color: '#fff', fontWeight: 700 }} />
                )}
              </Stack>
            </Box>
            <Stack spacing={1} alignItems="flex-end">
              {job.scheduledDate && (
                <Chip
                  icon={<Schedule sx={{ color: '#fff !important' }} />}
                  label={`${new Date(job.scheduledDate).toLocaleDateString('en-AU')} @ ${job.scheduledStartTime}`}
                  sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
                />
              )}
              <Chip
                icon={<LocationOn sx={{ color: '#fff !important' }} />}
                label={`${job.address.suburb}, ${job.address.state} ${job.address.postcode}`}
                sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </Stack>
          </Box>
        </CardContent>
      </Card>

      {/* Weather — shown for every scheduled job, styled as a plain forecast
          when conditions are fine and as a warning when there's actual risk. */}
      {weatherAdvisory && (
        <Card sx={{ mb: 3, bgcolor: weatherAdvisory.risk === 'low' ? undefined : '#fff8e1' }}>
          <CardContent>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <WbSunny sx={{ color: weatherAdvisory.risk === 'low' ? sbgColors.blue : '#f57c00' }} />
              <Typography variant="subtitle2" fontWeight={700} color={weatherAdvisory.risk === 'low' ? 'text.primary' : '#f57c00'}>
                {weatherAdvisory.risk === 'low' ? 'Weather Forecast' : 'Weather Advisory'}
              </Typography>
              <Chip
                label={`${weatherAdvisory.risk} risk`}
                size="small"
                sx={{
                  ml: 'auto', fontWeight: 700, textTransform: 'capitalize',
                  bgcolor: weatherAdvisory.risk === 'high' ? '#ffcdd2' : weatherAdvisory.risk === 'medium' ? '#ffe0b2' : '#e0f2f1',
                  color: weatherAdvisory.risk === 'high' ? '#c62828' : weatherAdvisory.risk === 'medium' ? '#e65100' : '#00695c',
                }}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary" mb={weatherAdvisory.advisories.length ? 1 : 0}>
              {new Date(weatherAdvisory.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'short' })}
              {' — '}{weatherAdvisory.condition}, {weatherAdvisory.tempMaxC}°C, wind {weatherAdvisory.windSpeedKmh} km/h, rain chance {weatherAdvisory.rainChancePct}%
            </Typography>
            {weatherAdvisory.advisories.map(advisory => (
              <Typography key={advisory} variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                ⚠ {advisory}
              </Typography>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Progress stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Job Progress</Typography>
          <Stepper activeStep={activeStep} alternativeLabel>
            {JOB_STAGES.map(stage => (
              <Step key={stage.key}>
                <StepLabel
                  StepIconProps={{
                    style: {
                      color: JOB_STAGES.indexOf(stage) <= activeStep
                        ? STATUS_COLORS[stage.key] ?? sbgColors.blue
                        : undefined,
                    },
                  }}
                >
                  <Typography variant="caption">{stage.label}</Typography>
                </StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Details" icon={<Description sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Photos" icon={<CameraAlt sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Invoice" icon={<Receipt sx={{ fontSize: 16 }} />} iconPosition="start" />
          <Tab label="Certificates" icon={<CheckCircle sx={{ fontSize: 16 }} />} iconPosition="start" />
        </Tabs>

        {/* Details tab */}
        {tab === 0 && (
          <CardContent>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>System Details</Typography>
                {[
                  ['System Size', job.systemSizeKw ? `${job.systemSizeKw} kW` : '—'],
                  ['Panel Count', job.panelCount ?? '—'],
                  ['Panel Model', job.panelModel ?? '—'],
                  ['Inverter', job.inverterModel ?? '—'],
                  ['Battery', job.batteryModel ?? '—'],
                  ['Duration', `${job.estimatedDuration} mins`],
                ].map(([label, value]) => (
                  <Box key={label as string} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography>
                    <Typography variant="body2" fontWeight={600}>{value}</Typography>
                  </Box>
                ))}
                {job.notes && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    <Typography variant="body2">{job.notes}</Typography>
                  </Alert>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={700} mb={1.5}>
                  <Engineering sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Assigned Installers
                </Typography>
                {installers.length === 0 ? (
                  <Typography color="text.secondary" variant="body2" mb={1.5}>No installers assigned</Typography>
                ) : (
                  installers.map(installer => (
                    <Box key={installer.id} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, bgcolor: sbgColors.blue, fontSize: 14 }}>
                        {installer.firstName[0]}{installer.lastName[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="body2" fontWeight={700}>
                          {installer.firstName} {installer.lastName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                          {installer.role} · Lic. {installer.licenceNumber}
                        </Typography>
                      </Box>
                      <Chip
                        label={installer.recRegistration ? 'CEC Accredited' : 'Installer'}
                        size="small"
                        sx={{ ml: 'auto', bgcolor: '#e8f5e9', color: '#2e7d32', fontSize: 10 }}
                      />
                    </Box>
                  ))
                )}

                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Actions</Typography>
                <Stack spacing={1}>
                  {isNotYetScheduled && (
                    <Button variant="contained" fullWidth startIcon={<PersonAdd />} disabled={updating} onClick={openAssignDialog}>
                      Schedule Job & Assign Installer
                    </Button>
                  )}
                  {job.status === 'scheduled' && (
                    <Button variant="contained" color="warning" fullWidth disabled={updating} onClick={() => updateStatus('in_progress')}>
                      Mark In Progress
                    </Button>
                  )}
                  {job.status === 'in_progress' && (
                    <Button variant="contained" color="success" fullWidth startIcon={<CheckCircle />} disabled={updating} onClick={() => updateStatus('completed')}>
                      Mark Complete
                    </Button>
                  )}
                  {job.status === 'completed' && (
                    <Button variant="contained" fullWidth startIcon={<Receipt />} onClick={notImplemented}>
                      Generate Invoice
                    </Button>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        )}

        {/* Photos tab */}
        {tab === 1 && <PhotoUploadPanel jobId={job.id} />}

        {/* Invoice tab */}
        {tab === 2 && (
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700}>Invoices</Typography>
              <Button variant="outlined" size="small" startIcon={<Receipt />} onClick={notImplemented}>Generate Invoice</Button>
            </Box>
            <Alert severity="info">
              Invoice will be generated once the job is marked complete. Deposit invoice sent on quote acceptance.
            </Alert>
          </CardContent>
        )}

        {/* Certificates tab */}
        {tab === 3 && (
          <CardContent>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Compliance Documents</Typography>
            {['CES', 'STC Assignment Form'].map(cert => (
              <Card key={cert} variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="body2" fontWeight={700}>{cert}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {cert === 'CES'
                        ? 'Certificate of Electrical Safety — Energy Safe Victoria'
                        : 'STC Assignment Form — Clean Energy Regulator'}
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    variant={job.status === 'completed' ? 'contained' : 'outlined'}
                    startIcon={<Download />}
                    disabled={job.status !== 'completed'}
                    onClick={notImplemented}
                  >
                    {job.status === 'completed' ? 'Download PDF' : 'Available after completion'}
                  </Button>
                </Box>
              </Card>
            ))}
          </CardContent>
        )}
      </Card>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>{isNotYetScheduled ? 'Schedule Job & Assign Installer' : 'Reassign Installer'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                label="Date" type="date" fullWidth
                InputLabelProps={{ shrink: true }}
                value={assignDate} onChange={e => setAssignDate(e.target.value)}
              />
              <TextField
                label="Start Time" type="time" fullWidth
                InputLabelProps={{ shrink: true }}
                value={assignTime} onChange={e => setAssignTime(e.target.value)}
              />
            </Stack>
            <FormControl fullWidth sx={{ mb: selectedHasConflict || selectedHasIneligible || assignError ? 2 : 0 }}>
              <InputLabel>Installers</InputLabel>
              <Select
                multiple value={assignInstallerIds}
                onChange={e => setAssignInstallerIds(e.target.value as string[])}
                label="Installers"
                renderValue={selected =>
                  availableInstallers
                    .filter(i => selected.includes(i.id))
                    .map(i => `${i.firstName} ${i.lastName}`)
                    .join(', ')
                }
              >
                {availableInstallers.map(i => {
                  const isBusy = conflictingInstallerIds.has(i.id)
                  const ineligibleReason = assignDate ? installerIneligibilityReason(i, job, assignDate) : null
                  const reasonText = isBusy
                    ? ' (already assigned at this time)'
                    : ineligibleReason ? ` (${ineligibleReason})` : ''
                  const base = i.homeBase ? ` — ${i.homeBase}, ${i.state}` : ''
                  return (
                    <MenuItem key={i.id} value={i.id} disabled={isBusy || !!ineligibleReason}>
                      <Checkbox checked={assignInstallerIds.includes(i.id)} size="small" />
                      <ListItemText
                        primary={`${i.firstName} ${i.lastName} — ${i.role}${base}${reasonText}`}
                      />
                    </MenuItem>
                  )
                })}
              </Select>
            </FormControl>
            {selectedHasConflict && (
              <Alert severity="warning" sx={{ mb: selectedHasIneligible || assignError ? 2 : 0 }}>
                An installer you've selected is already assigned to another job at this date and time. Remove them or change the date/time to continue.
              </Alert>
            )}
            {selectedHasIneligible && (
              <Alert severity="warning" sx={{ mb: assignError ? 2 : 0 }}>
                An installer you've selected isn't rostered for this date or doesn't service this state. Remove them or adjust the date to continue.
              </Alert>
            )}
            {assignError && <Alert severity="error">{assignError}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={assignInstallerIds.length === 0 || !assignDate || assigning || selectedHasConflict || selectedHasIneligible}
            onClick={confirmAssign}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
