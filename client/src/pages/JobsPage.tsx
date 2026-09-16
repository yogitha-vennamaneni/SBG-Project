import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, TextField, InputAdornment, Avatar, Stack, Chip,
  CircularProgress, Alert,
} from '@mui/material'
import { Search, LocationOn } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { jobsApi } from '../services/api'
import { Job } from '../types'
import { sbgColors } from '../theme'

const STATUS_COLORS: Record<string, string> = {
  enquiry: '#9e9e9e', quoted: '#1976d2', quote_sent: '#1976d2',
  quote_accepted: sbgColors.teal, quote_declined: '#c62828',
  deposit_paid: sbgColors.teal, scheduled: sbgColors.blue,
  confirmed: sbgColors.blue, unscheduled: '#9e9e9e',
  in_progress: '#f57c00', completed: '#2e7d32', invoiced: '#2e7d32',
  paid: '#2e7d32', cancelled: '#c62828',
}

export default function JobsPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    jobsApi.list()
      .then(res => setJobs(res.data))
      .catch(() => setError('Failed to load jobs'))
      .finally(() => setLoading(false))
  }, [])

  const customerName = (j: Job) =>
    j.customerName ?? (j.customer ? `${j.customer.firstName} ${j.customer.lastName}` : '—')

  const scheduled = (j: Job) => {
    if (j.scheduledStart) return new Date(j.scheduledStart).toLocaleString('en-AU')
    if (j.scheduledDate) return `${new Date(j.scheduledDate).toLocaleDateString('en-AU')}${j.scheduledStartTime ? ` @ ${j.scheduledStartTime}` : ''}`
    return '—'
  }

  const filtered = jobs.filter(j =>
    `${j.jobCode ?? j.id} ${customerName(j)} ${j.jobType} ${j.status} ${j.address.suburb}`
      .toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
        <TextField
          placeholder="Search jobs…" size="small" sx={{ width: 320 }}
          value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
        />
        <Typography color="text.secondary">{filtered.length} jobs</Typography>
      </Stack>
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              {['Job', 'Customer', 'Type', 'Status', 'Scheduled', 'Address'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(j => (
              <TableRow key={j.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/jobs/${j.id}`)}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: sbgColors.blue, width: 36, height: 36, fontSize: 14 }}>
                      {(j.jobCode ?? j.id).slice(-2).toUpperCase()}
                    </Avatar>
                    <Typography variant="body2" fontWeight={700}>
                      {j.jobCode ?? j.id}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{customerName(j)}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {j.jobType.replace('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={j.status.replace('_', ' ')}
                    size="small"
                    sx={{
                      bgcolor: `${STATUS_COLORS[j.status] ?? '#9e9e9e'}20`,
                      color: STATUS_COLORS[j.status] ?? '#9e9e9e',
                      fontWeight: 700, textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{scheduled(j)}</Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOn sx={{ fontSize: 14, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {j.address.suburb}, {j.address.state} {j.address.postcode}
                    </Typography>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
