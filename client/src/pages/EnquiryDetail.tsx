import { useParams, useNavigate } from 'react-router-dom'
import { Box, Button, Typography } from '@mui/material'
import { ArrowBack } from '@mui/icons-material'

export default function EnquiryDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  return (
    <Box>
      <Button startIcon={<ArrowBack />} onClick={() => navigate(-1)} sx={{ mb: 2 }}>Back</Button>
      <Typography variant="h5" fontWeight={700}>Enquiry #{id}</Typography>
    </Box>
  )
}
