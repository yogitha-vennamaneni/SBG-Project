import { createTheme } from '@mui/material/styles'

// SBG Brand Colors (extracted from solarbatterygroup.com.au)
export const sbgColors = {
  blue: '#1d1dff',        // Primary SBG Blue (CSS var --primary)
  yellow: '#ffdb14',      // SBG Yellow (CSS var --secondary)
  dark: '#212529',        // Near-black (Find My Fit button / nav dark)
  teal: '#00c9b1',        // Teal accent (hero graphic star shape)
  lightGray: '#e9ecef',   // Light background
  medGray: '#6c757d',     // Medium grey
  darkGray: '#495057',    // Dark grey text
  white: '#ffffff',
  offWhite: '#f8f9fa',
}

const theme = createTheme({
  palette: {
    primary: {
      main: sbgColors.blue,
      light: '#5b5bff',
      dark: '#0000cc',
      contrastText: '#ffffff',
    },
    secondary: {
      main: sbgColors.yellow,
      light: '#ffe766',
      dark: '#c8ab00',
      contrastText: sbgColors.dark,
    },
    error: {
      main: '#d32f2f',
    },
    warning: {
      main: '#f57c00',
    },
    success: {
      main: '#2e7d32',
    },
    info: {
      main: sbgColors.teal,
    },
    background: {
      default: sbgColors.offWhite,
      paper: sbgColors.white,
    },
    text: {
      primary: sbgColors.dark,
      secondary: sbgColors.darkGray,
    },
  },
  typography: {
    fontFamily: '"Montserrat", "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontFamily: '"Anton", "Montserrat", sans-serif',
      fontWeight: 700,
    },
    h2: {
      fontFamily: '"Anton", "Montserrat", sans-serif',
      fontWeight: 700,
    },
    h3: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 24,
          padding: '10px 24px',
          fontWeight: 700,
          fontSize: '0.95rem',
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${sbgColors.blue} 0%, #4040ff 100%)`,
          '&:hover': {
            background: `linear-gradient(135deg, #0000cc 0%, ${sbgColors.blue} 100%)`,
          },
        },
        containedSecondary: {
          color: sbgColors.dark,
          '&:hover': {
            backgroundColor: '#e8c800',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: sbgColors.dark,
        },
      },
    },
  },
})

export default theme
