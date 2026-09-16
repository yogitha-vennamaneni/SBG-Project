/**
 * Central Auth0 config + master switch. `authConfigured` gates every other piece
 * of the auth integration (provider mount, login redirect, token attachment) —
 * when false, the app renders exactly as it did before Auth0 was wired in.
 * Defaults to off (VITE_AUTH_ENABLED unset) so it stays inert until the Auth0
 * tenant/SPA app are confirmed ready.
 */
export const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined
export const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined
export const AUTH0_AUDIENCE = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined
export const AUTH_ENABLED = import.meta.env.VITE_AUTH_ENABLED === 'true'

export const authConfigured = AUTH_ENABLED && !!AUTH0_DOMAIN && !!AUTH0_CLIENT_ID
