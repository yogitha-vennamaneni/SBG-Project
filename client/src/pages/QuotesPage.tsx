import {
  Box, Card, Table, TableBody, TableCell, TableHead, TableRow,
  Typography, Chip, Button, Stack, Avatar, CircularProgress, Alert,
} from '@mui/material'
import { Download, Send, CheckCircle } from '@mui/icons-material'
import { useEffect, useState } from 'react'
import { quotesApi } from '../services/api'
import { Quote } from '../types'
import { sbgColors } from '../theme'
import { notImplemented } from '../utils/notImplemented'

const DOCSIGN_COLORS: Record<string, string> = {
  draft: '#9e9e9e', sent: sbgColors.blue, viewed: '#f57c00',
  signed: '#2e7d32', declined: '#d32f2f', expired: '#9e9e9e',
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sendingId, setSendingId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    quotesApi.list()
      .then(res => setQuotes(res.data))
      .catch(() => setError('Failed to load quotes'))
      .finally(() => setLoading(false))
  }, [])

  const handleSend = async (id: string) => {
    setSendingId(id)
    try {
      const updated = await quotesApi.send(id)
      setQuotes(qs => qs.map(q => q.id === id ? { ...q, docSignStatus: updated.docSignStatus } : q))
    } catch {
      setError('Failed to send quote')
    } finally {
      setSendingId(null)
    }
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}><CircularProgress /></Box>
  if (error) return <Alert severity="error">{error}</Alert>

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>Quotes</Typography>
          <Typography color="text.secondary">{quotes.length} quotes</Typography>
        </Box>
        <Button variant="contained" startIcon={<CheckCircle />} onClick={notImplemented}>New Quote</Button>
      </Box>
      <Card>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              {['Quote #', 'Customer', 'Job Type', 'Total (AUD)', 'Deposit', 'DocSign', 'Actions'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {quotes.map(q => (
              <TableRow key={q.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{q.id.toUpperCase()}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(q.createdAt).toLocaleDateString('en-AU')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Avatar sx={{ width: 28, height: 28, bgcolor: sbgColors.blue, fontSize: 11 }}>
                      {q.customer?.firstName?.[0]}{q.customer?.lastName?.[0]}
                    </Avatar>
                    <Typography variant="body2">
                      {q.customer?.firstName} {q.customer?.lastName}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {q.jobType.replace('_', ' ')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>${q.total.toLocaleString()}</Typography>
                  <Typography variant="caption" color="text.secondary">incl. GST</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color={sbgColors.teal} fontWeight={600}>
                    ${q.depositAmount.toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={q.docSignStatus}
                    size="small"
                    sx={{
                      bgcolor: `${DOCSIGN_COLORS[q.docSignStatus]}18`,
                      color: DOCSIGN_COLORS[q.docSignStatus],
                      fontWeight: 700, textTransform: 'capitalize',
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Stack direction="row" spacing={0.5}>
                    <Button
                      size="small" startIcon={<Download />} variant="outlined"
                      component="a" href={quotesApi.previewPdf(q.id)} target="_blank" rel="noopener"
                    >
                      PDF
                    </Button>
                    {q.docSignStatus === 'draft' && (
                      <Button
                        size="small" startIcon={<Send />} variant="contained"
                        disabled={sendingId === q.id}
                        onClick={() => handleSend(q.id)}
                      >
                        Send
                      </Button>
                    )}
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
