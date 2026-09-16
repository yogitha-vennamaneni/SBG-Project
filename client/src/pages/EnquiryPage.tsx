import { useEffect, useState } from 'react'
import {
  Box, Button, Card, Chip, Dialog, DialogContent,
  DialogTitle, Grid, IconButton, Typography, Table, TableBody,
  TableCell, TableHead, TableRow, TextField, MenuItem, Stack,
  CircularProgress, Alert,
} from '@mui/material'
import { Add, Close, WbSunny, BatteryChargingFull, EvStation, Roofing, Build } from '@mui/icons-material'
import { useForm, Controller } from 'react-hook-form'
import { Job, JobType } from '../types'
import { customersApi, jobsApi } from '../services/api'
import { sbgColors } from '../theme'
import { notImplemented } from '../utils/notImplemented'

const JOB_TYPES: { value: JobType; label: string; icon: React.ReactNode; color: string }[] = [
  { value: 'solar_installation', label: 'Solar Installation', icon: <WbSunny />, color: sbgColors.yellow },
  { value: 'battery_installation', label: 'Battery Installation', icon: <BatteryChargingFull />, color: sbgColors.teal },
  { value: 'ev_charger', label: 'EV Charger', icon: <EvStation />, color: '#7c4dff' },
  { value: 'roof_renovation', label: 'Roof Renovation', icon: <Roofing />, color: '#ff7043' },
  { value: 'solar_adjustment', label: 'Solar Service', icon: <Build />, color: sbgColors.blue },
]

const STATUS_COLORS: Record<string, string> = {
  new: '#1976d2', reviewed: '#f57c00', quoted: '#2e7d32',
}

export default function EnquiryPage() {
  const [open, setOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<JobType>('solar_installation')
  const { control, handleSubmit, reset } = useForm()

  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadEnquiries = () => {
    setLoading(true)
    jobsApi.list({ status: 'enquiry' })
      .then(res => setJobs(res.data))
      .catch(() => setError('Failed to load enquiries'))
      .finally(() => setLoading(false))
  }

  useEffect(loadEnquiries, [])

  const enquiries = jobs

  const onSubmit = async (data: any) => {
    setSubmitting(true)
    try {
      const customer = await customersApi.create({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      } as any)
      await jobsApi.create({
        customerId: customer.id,
        jobType: selectedType,
        street: data.street,
        suburb: data.suburb,
        state: data.state,
        postcode: data.postcode,
        notes: data.description || undefined,
        systemSizeKw: data.systemSizeKw ? Number(data.systemSizeKw) : undefined,
      } as any)
      setOpen(false)
      reset()
      loadEnquiries()
    } catch {
      setError('Failed to create enquiry')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Enquiries</Typography>
          <Typography color="text.secondary">{enquiries.length} pending review</Typography>
        </Box>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          New Enquiry
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Job type filter chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Chip label="All" variant="filled" color="primary" sx={{ fontWeight: 700 }} />
        {JOB_TYPES.map(jt => (
          <Chip key={jt.value} label={jt.label} icon={<Box sx={{ color: jt.color }}>{jt.icon}</Box>} variant="outlined" />
        ))}
      </Stack>

      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 700 }}>Customer</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Job Type</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Address</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {jobs.map(job => (
              <TableRow key={job.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {job.customer?.firstName} {job.customer?.lastName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">{job.customer?.email}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ color: JOB_TYPES.find(t => t.value === job.jobType)?.color }}>
                      {JOB_TYPES.find(t => t.value === job.jobType)?.icon}
                    </Box>
                    <Typography variant="body2">
                      {JOB_TYPES.find(t => t.value === job.jobType)?.label}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{job.address.suburb}, {job.address.state}</Typography>
                  <Typography variant="caption" color="text.secondary">{job.address.postcode}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{new Date(job.createdAt).toLocaleDateString('en-AU')}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={job.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: `${STATUS_COLORS[job.status] ?? '#9e9e9e'}18`,
                      color: STATUS_COLORS[job.status] ?? '#9e9e9e',
                      fontWeight: 700, textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button size="small" variant="outlined" onClick={notImplemented}>View</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* New Enquiry Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight={700}>New Enquiry</Typography>
          <IconButton onClick={() => setOpen(false)}><Close /></IconButton>
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ pt: 1 }}>
            {/* Job type selector */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Job Type</Typography>
            <Grid container spacing={1.5} mb={3}>
              {JOB_TYPES.map(jt => (
                <Grid size={{ xs: 6, sm: 4 }} key={jt.value}>
                  <Card
                    onClick={() => setSelectedType(jt.value)}
                    sx={{
                      cursor: 'pointer', p: 1.5, textAlign: 'center',
                      border: '2px solid',
                      borderColor: selectedType === jt.value ? sbgColors.blue : 'transparent',
                      bgcolor: selectedType === jt.value ? `${sbgColors.blue}08` : 'background.paper',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: sbgColors.blue },
                    }}
                  >
                    <Box sx={{ color: jt.color, mb: 0.5 }}>{jt.icon}</Box>
                    <Typography variant="caption" fontWeight={600}>{jt.label}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>

            {/* Customer fields */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Customer Details</Typography>
            <Grid container spacing={2} mb={2}>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="firstName" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="First Name" fullWidth size="small" required />}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="lastName" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Last Name" fullWidth size="small" required />}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="email" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Email" fullWidth size="small" type="email" required />}
                />
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Controller
                  name="phone" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Phone" fullWidth size="small" required />}
                />
              </Grid>
            </Grid>

            {/* Address */}
            <Typography variant="subtitle2" fontWeight={700} mb={1}>Installation Address</Typography>
            <Grid container spacing={2} mb={2}>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="street" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Street Address" fullWidth size="small" required />}
                />
              </Grid>
              <Grid size={{ xs: 5 }}>
                <Controller
                  name="suburb" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Suburb" fullWidth size="small" required />}
                />
              </Grid>
              <Grid size={{ xs: 3 }}>
                <Controller
                  name="state" control={control} defaultValue="VIC"
                  render={({ field }) => (
                    <TextField {...field} label="State" fullWidth size="small" select>
                      {['VIC', 'NSW', 'QLD', 'SA', 'WA', 'TAS', 'ACT', 'NT'].map(s => (
                        <MenuItem key={s} value={s}>{s}</MenuItem>
                      ))}
                    </TextField>
                  )}
                />
              </Grid>
              <Grid size={{ xs: 4 }}>
                <Controller
                  name="postcode" control={control} defaultValue=""
                  render={({ field }) => <TextField {...field} label="Postcode" fullWidth size="small" required />}
                />
              </Grid>
            </Grid>

            {/* Job-type specific fields */}
            {selectedType === 'solar_installation' && (
              <>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>System Details</Typography>
                <Grid container spacing={2} mb={2}>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="systemSizeKw" control={control} defaultValue=""
                      render={({ field }) => <TextField {...field} label="System Size (kW)" fullWidth size="small" type="number" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="roofType" control={control} defaultValue="tile"
                      render={({ field }) => (
                        <TextField {...field} label="Roof Type" fullWidth size="small" select>
                          {['tile', 'tin', 'flat', 'tilt'].map(r => (
                            <MenuItem key={r} value={r} sx={{ textTransform: 'capitalize' }}>{r}</MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {selectedType === 'battery_installation' && (
              <>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>Battery Details</Typography>
                <Grid container spacing={2} mb={2}>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="batteryCapacityKwh" control={control} defaultValue=""
                      render={({ field }) => <TextField {...field} label="Capacity (kWh)" fullWidth size="small" type="number" />}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="existingSolarKw" control={control} defaultValue=""
                      render={({ field }) => <TextField {...field} label="Existing Solar (kW)" fullWidth size="small" type="number" />}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            {selectedType === 'ev_charger' && (
              <>
                <Typography variant="subtitle2" fontWeight={700} mb={1}>EV Charger Details</Typography>
                <Grid container spacing={2} mb={2}>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="evChargerAmps" control={control} defaultValue={32}
                      render={({ field }) => (
                        <TextField {...field} label="Amperage" fullWidth size="small" select>
                          <MenuItem value={16}>16A</MenuItem>
                          <MenuItem value={32}>32A</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 6 }}>
                    <Controller
                      name="phaseType" control={control} defaultValue="single"
                      render={({ field }) => (
                        <TextField {...field} label="Phase" fullWidth size="small" select>
                          <MenuItem value="single">Single Phase</MenuItem>
                          <MenuItem value="three">Three Phase</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </>
            )}

            <Controller
              name="description" control={control} defaultValue=""
              render={({ field }) => (
                <TextField
                  {...field} label="Additional Notes" fullWidth size="small"
                  multiline rows={3} sx={{ mb: 2 }}
                />
              )}
            />

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button onClick={() => { setOpen(false); reset() }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create Enquiry'}
              </Button>
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  )
}
