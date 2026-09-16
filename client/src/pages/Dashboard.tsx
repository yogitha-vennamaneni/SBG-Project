import { useEffect, useState } from 'react'
import {
  Box, Grid, Card, CardContent, Typography, Chip, Button,
  Avatar, List, ListItem, ListItemAvatar, ListItemText,
  LinearProgress, Divider, Stack, CircularProgress, Alert,
} from '@mui/material'
import {
  TrendingUp, Work, Bolt, ElectricCar, Roofing, Build,
  ArrowForward, Schedule, CheckCircle, HourglassEmpty,
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { sbgColors } from '../theme'
import { Job, JobType, Installer } from '../types'
import { jobsApi, installersApi } from '../services/api'

const JOB_TYPE_ICONS: Record<JobType, React.ReactNode> = {
  solar_installation: <Bolt sx={{ color: sbgColors.yellow }} />,
  battery_installation: <Build sx={{ color: sbgColors.teal }} />,
  ev_charger: <ElectricCar sx={{ color: '#7c4dff' }} />,
  roof_renovation: <Roofing sx={{ color: '#ff7043' }} />,
  solar_adjustment: <Build sx={{ color: sbgColors.blue }} />,
  'Battery install': <Build sx={{ color: sbgColors.teal }} />,
  'Solar + battery': <Bolt sx={{ color: sbgColors.yellow }} />,
  'Battery upgrade': <Build sx={{ color: sbgColors.teal }} />,
}

const JOB_TYPE_LABELS: Record<JobType, string> = {
  solar_installation: 'Solar Install',
  battery_installation: 'Battery Install',
  ev_charger: 'EV Charger',
  roof_renovation: 'Roof Reno',
  solar_adjustment: 'Solar Service',
  'Battery install': 'Battery Install',
  'Solar + battery': 'Solar + Battery',
  'Battery upgrade': 'Battery Upgrade',
}

interface StatCardProps {
  title: string
  value: number | string
  subtitle: string
  color: string
  icon: React.ReactNode
  trend?: string
}

function StatCard({ title, value, subtitle, color, icon, trend }: StatCardProps) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 48, height: 48, borderRadius: 2,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              bgcolor: `${color}18`,
            }}
          >
            <Box sx={{ color }}>{icon}</Box>
          </Box>
          {trend && (
            <Chip
              label={trend}
              size="small"
              icon={<TrendingUp sx={{ fontSize: '14px !important' }} />}
              sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 600, fontSize: 11 }}
            />
          )}
        </Box>
        <Typography variant="h3" fontWeight={800} color={color}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState<Job[]>([])
  const [installers, setInstallers] = useState<Installer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([jobsApi.list(), installersApi.list()])
      .then(([jobsRes, installers]) => { setJobs(jobsRes.data); setInstallers(installers) })
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  const stats = {
    newEnquiries: jobs.filter(j => j.status === 'enquiry').length,
    scheduledToday: jobs.filter(j => j.scheduledDate && new Date(j.scheduledDate).toLocaleString().split(',')[0] === new Date().toLocaleString().split(',')[0]).length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completedThisWeek: jobs.filter(j => j.status === 'completed').length,
  }

  const recentJobs = jobs.slice(0, 5)

  const statusColor: Record<string, string> = {
    enquiry: '#9e9e9e',
    scheduled: sbgColors.blue,
    in_progress: '#f57c00',
    completed: '#2e7d32',
    deposit_paid: sbgColors.teal,
    paid: '#2e7d32',
  }

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" fontWeight={800}>Good morning! 👋</Typography>
        <Typography color="text.secondary">Here's what's happening today at SBG.</Typography>
      </Box>

      {/* Stat cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="New Enquiries"
            value={stats.newEnquiries}
            subtitle="Awaiting review"
            color={sbgColors.blue}
            icon={<Work />}
            trend="+12%"
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Scheduled Today"
            value={stats.scheduledToday}
            subtitle="Jobs on calendar"
            color={sbgColors.teal}
            icon={<Schedule />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="In Progress"
            value={stats.inProgress}
            subtitle="Active job sites"
            color="#f57c00"
            icon={<HourglassEmpty />}
          />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <StatCard
            title="Completed"
            value={stats.completedThisWeek}
            subtitle="This week"
            color="#2e7d32"
            icon={<CheckCircle />}
            trend="+5"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Recent jobs */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={700}>Recent Jobs</Typography>
                <Button endIcon={<ArrowForward />} onClick={() => navigate('/scheduler')} size="small">
                  View Scheduler
                </Button>
              </Box>
              <List disablePadding>
                {recentJobs.map((job, i) => (
                  <Box key={job.id}>
                    <ListItem
                      disablePadding
                      sx={{ py: 1.5, cursor: 'pointer', '&:hover': { bgcolor: '#f5f5f5', borderRadius: 1 }, px: 1 }}
                      onClick={() => navigate(`/jobs/${job.id}`)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: '#f5f5f5', width: 40, height: 40 }}>
                          {JOB_TYPE_ICONS[job.jobType]}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography variant="body2" fontWeight={600}>
                              {job.customer?.firstName} {job.customer?.lastName}
                            </Typography>
                            <Chip
                              label={JOB_TYPE_LABELS[job.jobType]}
                              size="small"
                              sx={{ fontSize: 10, height: 20 }}
                            />
                          </Stack>
                        }
                        secondary={job.address.suburb + ', ' + job.address.state}
                      />
                      <Chip
                        label={job.status.replace('_', ' ')}
                        size="small"
                        sx={{
                          bgcolor: `${statusColor[job.status] ?? '#9e9e9e'}18`,
                          color: statusColor[job.status] ?? '#9e9e9e',
                          fontWeight: 700,
                          fontSize: 10,
                          textTransform: 'capitalize',
                        }}
                      />
                    </ListItem>
                    {i < recentJobs.length - 1 && <Divider />}
                  </Box>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Installer availability */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" fontWeight={700} mb={2}>Installer Status</Typography>
              {installers.slice(0, 5).map(installer => (
                <Box key={installer.id} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: sbgColors.blue, fontSize: 12 }}>
                        {installer.firstName[0]}{installer.lastName[0]}
                      </Avatar>
                      <Typography variant="body2" fontWeight={600}>
                        {installer.firstName} {installer.lastName}
                      </Typography>
                    </Box>
                    <Chip
                      label={installer.role}
                      size="small"
                      sx={{ fontSize: 10, height: 18, textTransform: 'capitalize' }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={Math.floor(Math.random() * 60) + 30}
                      sx={{
                        flexGrow: 1, height: 6, borderRadius: 3,
                        bgcolor: '#eee',
                        '& .MuiLinearProgress-bar': { bgcolor: sbgColors.blue, borderRadius: 3 },
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">2 jobs</Typography>
                  </Box>
                </Box>
              ))}
              <Button
                fullWidth variant="outlined" size="small"
                onClick={() => navigate('/installers')}
                sx={{ mt: 1 }}
              >
                Manage Installers
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
