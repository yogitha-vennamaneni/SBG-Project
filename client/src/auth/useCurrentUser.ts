import { useAuth0 } from '@auth0/auth0-react'
import { authConfigured } from './config'
import { useRoles } from './useRoles'

/**
 * Presentation-ready current-user info for the sidebar/top-bar avatar. Falls
 * back to the original static "Admin User" placeholder when Auth0 isn't
 * configured/enabled, so the UI looks identical until this is turned on.
 */
export function useCurrentUser() {
  const { user } = useAuth0()
  const roles = useRoles()

  if (!authConfigured || !user) {
    return { name: 'Admin User', subtitle: 'Operations Manager', initial: 'A', picture: undefined as string | undefined }
  }

  const name = user.name ?? user.email ?? 'Signed in'
  return {
    name,
    subtitle: roles.length ? roles.join(', ') : (user.email ?? ''),
    initial: name.charAt(0).toUpperCase(),
    picture: user.picture,
  }
}
