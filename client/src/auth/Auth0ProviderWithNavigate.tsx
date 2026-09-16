import { PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'
import { Auth0Provider, AppState } from '@auth0/auth0-react'
import { authConfigured, AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_AUDIENCE } from './config'

/**
 * Wraps the app in Auth0Provider, routing the post-login redirect back through
 * react-router instead of a full page reload. A no-op passthrough when Auth0
 * isn't configured/enabled, so the app behaves exactly as before.
 */
export default function Auth0ProviderWithNavigate({ children }: PropsWithChildren) {
  const navigate = useNavigate()

  if (!authConfigured) return <>{children}</>

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo ?? window.location.pathname, { replace: true })
  }

  return (
    <Auth0Provider
      domain={AUTH0_DOMAIN!}
      clientId={AUTH0_CLIENT_ID!}
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(AUTH0_AUDIENCE ? { audience: AUTH0_AUDIENCE } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  )
}
