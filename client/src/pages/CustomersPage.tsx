import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Button, TextField, InputAdornment, Avatar, Stack, Chip,
  CircularProgress, Alert,
} from '@mui/material'
import { Search, Add, Phone, Email } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { customersApi } from '../services/api'
import { Customer } from '../types'
import { sbgColors } from '../theme'
import { notImplemented } from '../utils/notImplemented'

export default function CustomersPage() {
  const [search, setSearch] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    customersApi.list()
      .then(res => setCustomers(res.data))
      .catch(() => setError('Failed to load customers'))
      .finally(() => setLoading(false))
  }, [])

  const filtered = customers.filter(c =>
    `${c.firstName} ${c.lastName} ${c.email} ${c.address.suburb}`.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            placeholder="Search customers…" size="small" sx={{ width: 320 }}
            value={search} onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
          />
          <Typography color="text.secondary">{filtered.length} customers</Typography>
        </Stack>
        <Button variant="contained" startIcon={<Add />} onClick={notImplemented}>Add Customer</Button>
      </Box>
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              {['Customer', 'Contact', 'Address', 'NMI', 'Joined'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map(c => (
              <TableRow key={c.id} hover sx={{ cursor: 'pointer' }}>
                <TableCell>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <Avatar sx={{ bgcolor: sbgColors.blue, width: 36, height: 36, fontSize: 14 }}>
                      {c.firstName[0]}{c.lastName[0]}
                    </Avatar>
                    <Typography variant="body2" fontWeight={700}>
                      {c.firstName} {c.lastName}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Email sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption">{c.email}</Typography>
                    </Stack>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Phone sx={{ fontSize: 12, color: 'text.secondary' }} />
                      <Typography variant="caption">{c.phone}</Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{c.address.street}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {c.address.suburb}, {c.address.state} {c.address.postcode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip label={c.address.nmi ?? '—'} size="small" variant="outlined" sx={{ fontFamily: 'monospace', fontSize: 10 }} />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(c.createdAt).toLocaleDateString('en-AU')}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </Box>
  )
}
