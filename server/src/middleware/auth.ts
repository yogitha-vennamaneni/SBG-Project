/**
 * Auth0 JWT verification + role-based authorization middleware.
 * Validates incoming access tokens as RS256-signed JWTs against Auth0's JWKS
 * endpoint (https://${AUTH0_DOMAIN}/.well-known/jwks.json) — no shared secret
 * is held by this API.
 */
import { Request, Response, NextFunction } from 'express'
import { auth } from 'express-oauth2-jwt-bearer'

const domain = process.env.AUTH0_DOMAIN
const audience = process.env.AUTH0_AUDIENCE

if (!domain || !audience) {
  console.warn('⚠️  AUTH0_DOMAIN / AUTH0_AUDIENCE not set — protected routes will reject all requests.')
}

/**
 * Master switch for auth enforcement. Defaults to off so existing unauthenticated
 * flows (and other in-progress work sharing this dev server/DB) keep working until
 * this is deliberately turned on — set AUTH_ENABLED=true once the Auth0 tenant,
 * client apps, and role assignments are confirmed ready.
 */
export const authEnabled = process.env.AUTH_ENABLED === 'true'

/** Requires a valid Auth0 access token. Mount on routes that need auth. */
export const checkJwt = auth({
  issuerBaseURL: domain ? `https://${domain}/` : undefined,
  audience,
})

/**
 * Roles are shipped as a namespaced custom claim on the access token — Auth0
 * doesn't include assigned dashboard roles in tokens by default, so an Auth0
 * Action (Login flow, "Add roles to token") must add this claim. Configurable
 * in case the tenant already uses a different namespace.
 */
const ROLES_CLAIM = process.env.AUTH0_ROLES_CLAIM ?? 'https://sbg-scheduler.com/roles'

export type AppRole = 'admin' | 'technician'

function rolesFromRequest(req: Request): AppRole[] {
  const payload = (req as unknown as { auth?: { payload?: Record<string, unknown> } }).auth?.payload
  const claim = payload?.[ROLES_CLAIM]
  return Array.isArray(claim) ? (claim as AppRole[]) : []
}

/**
 * Restricts a route to one of the given roles. Must run after checkJwt (relies on
 * req.auth populated by it). A no-op when auth is disabled, so it's safe to leave
 * mounted while AUTH_ENABLED=false.
 */
export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!authEnabled) return next()
    const roles = rolesFromRequest(req)
    if (!roles.some((r) => allowedRoles.includes(r))) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}
