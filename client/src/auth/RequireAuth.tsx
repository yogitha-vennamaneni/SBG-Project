import { PropsWithChildren, useEffect, useRef } from 'react'
import { Box, CircularProgress, Alert, Button, Stack, Typography } from '@mui/material'
import { useAuth0 } from '@auth0/auth0-react'
import { authConfigured } from './config'

function LoadingScreen() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <CircularProgress />
    </Box>
  )
}

function ErrorScreen({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <Stack spacing={2} alignItems="center" sx={{ maxWidth: 420, textAlign: 'center' }}>
        <Alert severity="error" sx={{ width: '100%' }}>
          <Typography variant="body2">{message}</Typography>
        </Alert>
        <Button variant="contained" onClick={onRetry}>Try again</Button>
      </Stack>
    </Box>
  )
}

/**
 * Redirects to Auth0 login when signed out. A no-op passthrough when Auth0
 * isn't configured/enabled (authConfigured is off by default), so the app
 * stays open/unauthenticated until this is deliberately turned on.
 *
 * On an Auth0 `error` (e.g. an "Invalid state" from a double-processed
 * redirect callback under StrictMode, or blocked third-party cookies), we
 * show a retry screen instead of auto-redirecting again — looping straight
 * back into loginWithRedirect on every failure is what produces an endless
 * redirect-to-Auth0-and-back cycle that looks like the page refreshing over
 * and over. The ref also ensures we only fire the redirect once per signed-
 * out state, not once per render.
 */
export default function RequireAuth({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated, error, loginWithRedirect } = useAuth0()
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (authConfigured && !isLoading && !isAuthenticated && !error && !hasRedirected.current) {
      hasRedirected.current = true
      loginWithRedirect({ appState: { returnTo: window.location.pathname } })
    }
  }, [isLoading, isAuthenticated, error, loginWithRedirect])

  if (!authConfigured) return <>{children}</>

  if (error) {
    return (
      <ErrorScreen
        message={`Sign-in failed: ${error.message}`}
        onRetry={() => {
          hasRedirected.current = false
          loginWithRedirect({ appState: { returnTo: window.location.pathname } })
        }}
      />
    )
  }

  if (isLoading || !isAuthenticated) return <LoadingScreen />
  return <>{children}</>
}
