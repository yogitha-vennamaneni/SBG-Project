/**
 * Unit tests: services/api.ts request shaping.
 * axios is mocked at the module level so no real HTTP calls are made; we
 * assert each API namespace hits the endpoint/method/params the server
 * actually exposes (see server/src/routes/*.ts).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
  interceptors: { request: { use: vi.fn() } },
}

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockClient),
  },
}))

// Imported after the axios mock is registered, since api.ts calls axios.create() at module load.
const {
  quotesApi, jobsApi, installersApi, invoicesApi,
  certificatesApi, customersApi, weatherApi, stcApi, setAccessTokenGetter,
} = await import('../services/api')

// Captured once, right after import and before any beforeEach clears mock call
// history — api.ts registers this interceptor exactly once at module load.
const requestInterceptor = mockClient.interceptors.request.use.mock.calls[0]?.[0]

function resolved(data: unknown) {
  return Promise.resolve({ data })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('jobsApi', () => {
  it('list() GETs /jobs with query params', async () => {
    mockClient.get.mockReturnValueOnce(resolved({ data: [], total: 0, page: 1, pageSize: 100 }))
    await jobsApi.list({ status: 'scheduled', date: '2026-09-15' })
    expect(mockClient.get).toHaveBeenCalledWith('/jobs', { params: { status: 'scheduled', date: '2026-09-15' } })
  })

  it('assign() POSTs to /jobs/:jobId/assign with installerIds/date/startTime', async () => {
    mockClient.post.mockReturnValueOnce(resolved({}))
    await jobsApi.assign('job-1', ['inst-1'], '2026-09-15', '08:00')
    expect(mockClient.post).toHaveBeenCalledWith('/jobs/job-1/assign', {
      installerIds: ['inst-1'], date: '2026-09-15', startTime: '08:00',
    })
  })

  it('checkConflicts() POSTs to /jobs/check-conflicts', async () => {
    mockClient.post.mockReturnValueOnce(resolved({ hasConflict: false }))
    const params = { installerIds: ['inst-1'], date: '2026-09-15', startTime: '08:00', durationMinutes: 240 }
    await jobsApi.checkConflicts(params)
    expect(mockClient.post).toHaveBeenCalledWith('/jobs/check-conflicts', params)
  })

  it('updateStatus() PATCHes /jobs/:id/status', async () => {
    mockClient.patch.mockReturnValueOnce(resolved({}))
    await jobsApi.updateStatus('job-1', 'completed', 'done')
    expect(mockClient.patch).toHaveBeenCalledWith('/jobs/job-1/status', { status: 'completed', note: 'done' })
  })
})

describe('installersApi', () => {
  it('getSchedule() GETs /installers/:id/schedule with from/to params', async () => {
    mockClient.get.mockReturnValueOnce(resolved([]))
    await installersApi.getSchedule('inst-1', '2026-09-01', '2026-09-30')
    expect(mockClient.get).toHaveBeenCalledWith('/installers/inst-1/schedule', { params: { from: '2026-09-01', to: '2026-09-30' } })
  })
})

describe('customersApi', () => {
  it('getJobs() GETs /customers/:id/jobs', async () => {
    mockClient.get.mockReturnValueOnce(resolved([]))
    await customersApi.getJobs('cust-1')
    expect(mockClient.get).toHaveBeenCalledWith('/customers/cust-1/jobs', undefined)
  })
})

describe('quotesApi', () => {
  it('send() POSTs /quotes/:id/send with no body', async () => {
    mockClient.post.mockReturnValueOnce(resolved({}))
    await quotesApi.send('quote-1')
    expect(mockClient.post).toHaveBeenCalledWith('/quotes/quote-1/send', undefined)
  })
})

describe('invoicesApi', () => {
  it('generate() POSTs /invoices with jobId/type', async () => {
    mockClient.post.mockReturnValueOnce(resolved({}))
    await invoicesApi.generate('job-1', 'deposit')
    expect(mockClient.post).toHaveBeenCalledWith('/invoices', { jobId: 'job-1', type: 'deposit' })
  })
})

describe('certificatesApi', () => {
  it('generate() POSTs to /jobs/:jobId/certificates', async () => {
    mockClient.post.mockReturnValueOnce(resolved({}))
    await certificatesApi.generate('job-1', 'CES')
    expect(mockClient.post).toHaveBeenCalledWith('/jobs/job-1/certificates', { type: 'CES' })
  })
})

describe('weatherApi', () => {
  // Server exposes GET /api/weather/:postcode?suburb=... and wraps the
  // forecast array in { data: [...] } (see server/src/routes/weather.ts).
  it('forecast() GETs /weather/:postcode with a suburb param and unwraps the response', async () => {
    const forecast = [{ date: '2026-09-16', condition: 'sunny', tempMaxC: 24, windSpeedKmh: 12, rainChancePct: 5, risk: 'low', advisories: [] }]
    mockClient.get.mockReturnValueOnce(resolved({ data: forecast }))
    const result = await weatherApi.forecast('Box Hill', '3128')
    expect(mockClient.get).toHaveBeenCalledWith('/weather/3128', { params: { suburb: 'Box Hill' } })
    expect(result).toEqual(forecast)
  })
})

describe('stcApi', () => {
  // Server exposes POST /api/stc/calculate with a JSON body (see
  // server/src/routes/stc.ts), not a GET with query params — documenting the
  // client's current (mismatched) request shape.
  it('calculate() GETs /stc/calculate with systemSizeKw/postcode params', async () => {
    mockClient.get.mockReturnValueOnce(resolved({}))
    await stcApi.calculate(6.6, '3128')
    expect(mockClient.get).toHaveBeenCalledWith('/stc/calculate', { params: { systemSizeKw: 6.6, postcode: '3128' } })
  })
})

describe('auth token interceptor', () => {
  it('registers a request interceptor on the axios instance', () => {
    expect(requestInterceptor).toBeInstanceOf(Function)
  })

  it('prefers the Auth0 token getter over localStorage when one is registered', async () => {
    setAccessTokenGetter(async () => 'auth0-token')
    const config = await requestInterceptor({ headers: {} as Record<string, string> })
    expect(config.headers.Authorization).toBe('Bearer auth0-token')
    setAccessTokenGetter(null)
  })

  it('falls back to the localStorage token when no Auth0 getter is registered', async () => {
    const originalGetItem = Storage.prototype.getItem
    Storage.prototype.getItem = vi.fn(() => 'legacy-token')
    const config = await requestInterceptor({ headers: {} as Record<string, string> })
    expect(config.headers.Authorization).toBe('Bearer legacy-token')
    Storage.prototype.getItem = originalGetItem
  })
})
