import { useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'
import { authConfigured } from './config'
import { setAccessTokenGetter } from '../services/api'

/**
 * Bridges the Auth0 React SDK (hook-based) into services/api.ts's axios
 * interceptor (module-level, non-React) by registering a token getter whenever
 * the signed-in state changes. Renders nothing.
 */
export default function AuthTokenBridge() {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0()

  useEffect(() => {
    if (!authConfigured) return
    setAccessTokenGetter(
      isAuthenticated
        ? async () => {
            const token = await getAccessTokenSilently()
            if (!token) throw new Error('No access token available')
            return token
          }
        : null
    )
  }, [isAuthenticated, getAccessTokenSilently])

  return null
}
