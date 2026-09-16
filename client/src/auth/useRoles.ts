import { useAuth0 } from '@auth0/auth0-react'

const ROLES_CLAIM = (import.meta.env.VITE_AUTH0_ROLES_CLAIM as string | undefined)
  ?? 'https://sbg-scheduler.com/roles'

export type AppRole = 'admin' | 'technician'

/** Roles come from a namespaced custom claim an Auth0 Action adds to the ID token. */
export function useRoles(): AppRole[] {
  const { user } = useAuth0()
  const claim = (user as Record<string, unknown> | undefined)?.[ROLES_CLAIM]
  return Array.isArray(claim) ? (claim as AppRole[]) : []
}

/** For gating UI (e.g. hiding admin-only buttons) — the API still enforces this server-side. */
export function useHasRole(...roles: AppRole[]): boolean {
  const userRoles = useRoles()
  return userRoles.some((r) => roles.includes(r))
}
