jest.mock('express-oauth2-jwt-bearer', () => ({
  auth: jest.fn(() => jest.fn()),
}))

const OLD_ENV = process.env

function mockRes() {
  const res: any = {}
  res.status = jest.fn().mockReturnValue(res)
  res.json = jest.fn().mockReturnValue(res)
  return res
}

beforeEach(() => {
  jest.resetModules()
  process.env = { ...OLD_ENV }
})

afterAll(() => {
  process.env = OLD_ENV
})

describe('checkJwt configuration', () => {
  it('configures issuerBaseURL and audience from AUTH0_DOMAIN / AUTH0_AUDIENCE', () => {
    process.env.AUTH0_DOMAIN = 'sbg.auth0.com'
    process.env.AUTH0_AUDIENCE = 'https://api.sbg.example.com'

    require('../middleware/auth')
    const jwtBearer = require('express-oauth2-jwt-bearer').auth

    expect(jwtBearer).toHaveBeenCalledWith({
      issuerBaseURL: 'https://sbg.auth0.com/',
      audience: 'https://api.sbg.example.com',
    })
  })

  it('warns and configures an undefined issuer when AUTH0_DOMAIN / AUTH0_AUDIENCE are missing', () => {
    delete process.env.AUTH0_DOMAIN
    delete process.env.AUTH0_AUDIENCE
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {})

    require('../middleware/auth')
    const jwtBearer = require('express-oauth2-jwt-bearer').auth

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('AUTH0_DOMAIN / AUTH0_AUDIENCE not set'))
    expect(jwtBearer).toHaveBeenCalledWith({ issuerBaseURL: undefined, audience: undefined })
    warnSpy.mockRestore()
  })
})

describe('authEnabled', () => {
  it('is false by default', () => {
    delete process.env.AUTH_ENABLED
    const { authEnabled } = require('../middleware/auth')
    expect(authEnabled).toBe(false)
  })

  it('is true when AUTH_ENABLED=true', () => {
    process.env.AUTH_ENABLED = 'true'
    const { authEnabled } = require('../middleware/auth')
    expect(authEnabled).toBe(true)
  })

  it('is false for any other value', () => {
    process.env.AUTH_ENABLED = 'yes'
    const { authEnabled } = require('../middleware/auth')
    expect(authEnabled).toBe(false)
  })
})

describe('requireRole', () => {
  it('always calls next() when auth is disabled, regardless of roles', () => {
    delete process.env.AUTH_ENABLED
    const { requireRole } = require('../middleware/auth')
    const next = jest.fn()
    const res = mockRes()

    requireRole('admin')({} as any, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('calls next() when the token carries an allowed role', () => {
    process.env.AUTH_ENABLED = 'true'
    const { requireRole } = require('../middleware/auth')
    const next = jest.fn()
    const res = mockRes()
    const req: any = { auth: { payload: { 'https://sbg-scheduler.com/roles': ['technician'] } } }

    requireRole('admin', 'technician')(req, res, next)

    expect(next).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalled()
  })

  it('returns 403 when the token lacks an allowed role', () => {
    process.env.AUTH_ENABLED = 'true'
    const { requireRole } = require('../middleware/auth')
    const next = jest.fn()
    const res = mockRes()
    const req: any = { auth: { payload: { 'https://sbg-scheduler.com/roles': ['technician'] } } }

    requireRole('admin')(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' })
  })

  it('returns 403 when the request carries no roles claim at all', () => {
    process.env.AUTH_ENABLED = 'true'
    const { requireRole } = require('../middleware/auth')
    const next = jest.fn()
    const res = mockRes()

    requireRole('admin')({} as any, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('reads roles from a custom claim namespace when AUTH0_ROLES_CLAIM is set', () => {
    process.env.AUTH_ENABLED = 'true'
    process.env.AUTH0_ROLES_CLAIM = 'custom:roles'
    const { requireRole } = require('../middleware/auth')
    const next = jest.fn()
    const res = mockRes()
    const req: any = { auth: { payload: { 'custom:roles': ['admin'] } } }

    requireRole('admin')(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
