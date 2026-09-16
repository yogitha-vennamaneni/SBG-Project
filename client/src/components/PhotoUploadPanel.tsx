import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  Box, Typography, Grid, Card, CardMedia, CardContent,
  CardActions, Chip, IconButton, Select,
  MenuItem, FormControl, InputLabel, CircularProgress, Alert,
} from '@mui/material'
import { CloudUpload, Delete, ZoomIn } from '@mui/icons-material'
import { sbgColors } from '../theme'
import { notImplemented } from '../utils/notImplemented'

interface Photo {
  id: string
  url: string
  phase: 'before' | 'during' | 'after'
  caption?: string
  uploadedAt: string
}

interface PhotoUploadPanelProps {
  jobId: string
}

const SAMPLE_PHOTOS: Photo[] = [
  { id: 'p1', url: 'https://via.placeholder.com/300x200/1d1dff/fff?text=Before+1', phase: 'before', caption: 'Roof before install', uploadedAt: '2026-09-14T09:00:00Z' },
  { id: 'p2', url: 'https://via.placeholder.com/300x200/f57c00/fff?text=During+1', phase: 'during', caption: 'Panel layout', uploadedAt: '2026-09-14T11:00:00Z' },
  { id: 'p3', url: 'https://via.placeholder.com/300x200/2e7d32/fff?text=After+1', phase: 'after', caption: 'Installation complete', uploadedAt: '2026-09-14T14:00:00Z' },
]

const PHASE_COLORS: Record<string, string> = {
  before: '#1976d2',
  during: '#f57c00',
  after: '#2e7d32',
}

export default function PhotoUploadPanel({ jobId }: PhotoUploadPanelProps) {
  const [photos, setPhotos] = useState<Photo[]>(SAMPLE_PHOTOS)
  const [uploadPhase, setUploadPhase] = useState<'before' | 'during' | 'after'>('during')
  const [uploading, setUploading] = useState(false)
  const [filterPhase, setFilterPhase] = useState<'all' | 'before' | 'during' | 'after'>('all')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    try {
      // Simulate upload
      await new Promise(r => setTimeout(r, 1500))
      const newPhotos: Photo[] = acceptedFiles.map((file, i) => ({
        id: `p-${jobId}-${Date.now()}-${i}`,
        url: URL.createObjectURL(file),
        phase: uploadPhase,
        caption: file.name,
        uploadedAt: new Date().toISOString(),
      }))
      setPhotos(prev => [...prev, ...newPhotos])
    } finally {
      setUploading(false)
    }
  }, [uploadPhase])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.heic', '.webp'] },
    multiple: true,
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const filtered = filterPhase === 'all' ? photos : photos.filter(p => p.phase === filterPhase)

  return (
    <Box sx={{ p: 2 }}>
      {/* Upload zone */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Photo Phase</InputLabel>
          <Select
            value={uploadPhase}
            onChange={e => setUploadPhase(e.target.value as any)}
            label="Photo Phase"
          >
            <MenuItem value="before">Before</MenuItem>
            <MenuItem value="during">During</MenuItem>
            <MenuItem value="after">After</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box
        {...getRootProps()}
        sx={{
          border: `2px dashed ${isDragActive ? sbgColors.blue : '#ccc'}`,
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: isDragActive ? `${sbgColors.blue}08` : '#fafafa',
          transition: 'all 0.2s',
          mb: 3,
          '&:hover': { borderColor: sbgColors.blue, bgcolor: `${sbgColors.blue}04` },
        }}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={32} />
            <Typography variant="body2" color="text.secondary">Uploading to cloud storage…</Typography>
          </Box>
        ) : (
          <>
            <CloudUpload sx={{ fontSize: 40, color: sbgColors.blue, mb: 1 }} />
            <Typography variant="body2" fontWeight={700}>
              {isDragActive ? 'Drop photos here' : 'Drag & drop job photos'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              JPG, PNG, HEIC · max 10MB per file · phase: <strong>{uploadPhase}</strong>
            </Typography>
          </>
        )}
      </Box>

      {/* Filter */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        {(['all', 'before', 'during', 'after'] as const).map(ph => (
          <Chip
            key={ph}
            label={ph === 'all' ? `All (${photos.length})` : `${ph} (${photos.filter(p => p.phase === ph).length})`}
            onClick={() => setFilterPhase(ph)}
            sx={{
              fontWeight: 700,
              bgcolor: filterPhase === ph ? (PHASE_COLORS[ph] ?? sbgColors.blue) : undefined,
              color: filterPhase === ph ? '#fff' : undefined,
              textTransform: 'capitalize',
            }}
          />
        ))}
      </Box>

      {filtered.length === 0 ? (
        <Alert severity="info">No photos uploaded for this phase yet.</Alert>
      ) : (
        <Grid container spacing={2}>
          {filtered.map(photo => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={photo.id}>
              <Card>
                <CardMedia
                  component="img"
                  height={160}
                  image={photo.url}
                  alt={photo.caption}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ pb: 0 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Chip
                      label={photo.phase}
                      size="small"
                      sx={{
                        bgcolor: `${PHASE_COLORS[photo.phase]}18`,
                        color: PHASE_COLORS[photo.phase],
                        fontWeight: 700, textTransform: 'capitalize', fontSize: 10,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {new Date(photo.uploadedAt).toLocaleDateString('en-AU')}
                    </Typography>
                  </Box>
                  {photo.caption && (
                    <Typography variant="body2" mt={0.5} noWrap>{photo.caption}</Typography>
                  )}
                </CardContent>
                <CardActions sx={{ pt: 0, justifyContent: 'flex-end' }}>
                  <IconButton size="small" onClick={notImplemented}><ZoomIn fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setPhotos(prev => prev.filter(p => p.id !== photo.id))}>
                    <Delete fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  )
}
