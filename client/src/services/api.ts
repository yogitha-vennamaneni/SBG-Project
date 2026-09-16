import axios, { AxiosRequestConfig } from 'axios'
import {
  Customer, Enquiry, Quote, Job, Installer,
  JobPhoto, Invoice, Certificate, WeatherForecast,
  PaginatedResponse, JobStatus, StcCalculation,
  ConflictCheckResult, JobType
} from '../types'

// `||` (not `??`) so an empty-string VITE_API_URL — the documented "use the
// Vite dev proxy" setting in .env.example — also falls through to '/api'.
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Auth0 registers a token getter here once signed in (see auth/AuthTokenBridge.tsx);
// until then (or if Auth0 isn't configured/enabled) this stays null and requests
// fall back to the plain localStorage token, unchanged from before.
let getAuth0Token: (() => Promise<string>) | null = null
export function setAccessTokenGetter(fn: typeof getAuth0Token) {
  getAuth0Token = fn
}

client.interceptors.request.use(async (config) => {
  if (getAuth0Token) {
    try {
      config.headers.Authorization = `Bearer ${await getAuth0Token()}`
      return config
    } catch {
      // Not signed in / token refresh failed — fall through to the legacy token below.
    }
  }
  const token = localStorage.getItem('sbg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ─── Generic helpers ─────────────────────────────────────────────────────────

async function get<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const res = await client.get<T>(path, config)
  return res.data
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.post<T>(path, body)
  return res.data
}

async function put<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.put<T>(path, body)
  return res.data
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await client.patch<T>(path, body)
  return res.data
}

async function del<T>(path: string): Promise<T> {
  const res = await client.delete<T>(path)
  return res.data
}

// ─── Enquiries ───────────────────────────────────────────────────────────────

export const enquiriesApi = {
  list: (params?: { status?: string; page?: number }) =>
    get<PaginatedResponse<Enquiry>>('/enquiries', { params }),
  get: (id: string) => get<Enquiry>(`/enquiries/${id}`),
  create: (data: Partial<Enquiry>) => post<Enquiry>('/enquiries', data),
  update: (id: string, data: Partial<Enquiry>) => put<Enquiry>(`/enquiries/${id}`, data),
  delete: (id: string) => del<void>(`/enquiries/${id}`),
}

// ─── Quotes ──────────────────────────────────────────────────────────────────

export const quotesApi = {
  list: (params?: { status?: string }) =>
    get<PaginatedResponse<Quote>>('/quotes', { params }),
  get: (id: string) => get<Quote>(`/quotes/${id}`),
  create: (data: Partial<Quote>) => post<Quote>('/quotes', data),
  update: (id: string, data: Partial<Quote>) => put<Quote>(`/quotes/${id}`, data),
  send: (id: string) => post<Quote>(`/quotes/${id}/send`),
  previewPdf: (id: string) => `${BASE_URL}/quotes/${id}/pdf`,
}

// ─── Jobs ────────────────────────────────────────────────────────────────────

export const jobsApi = {
  list: (params?: { status?: JobStatus; date?: string; installerId?: string }) =>
    get<PaginatedResponse<Job>>('/jobs', { params }),
  get: (id: string) => get<Job>(`/jobs/${id}`),
  create: (data: Partial<Job>) => post<Job>('/jobs', data),
  update: (id: string, data: Partial<Job>) => put<Job>(`/jobs/${id}`, data),
  updateStatus: (id: string, status: JobStatus, note?: string) =>
    patch<Job>(`/jobs/${id}/status`, { status, note }),
  assign: (jobId: string, installerIds: string[], date: string, startTime: string) =>
    post<Job>(`/jobs/${jobId}/assign`, { installerIds, date, startTime }),
  unassign: (jobId: string) => post<Job>(`/jobs/${jobId}/unassign`),
  checkConflicts: (params: {
    installerIds: string[]
    date: string
    startTime: string
    durationMinutes: number
    excludeJobId?: string
  }) => post<ConflictCheckResult>('/jobs/check-conflicts', params),
  getStatusHistory: (id: string) => get<any[]>(`/jobs/${id}/history`),
}

// ─── Installers ──────────────────────────────────────────────────────────────

export const installersApi = {
  list: (params?: { skill?: JobType; date?: string }) =>
    get<Installer[]>('/installers', { params }),
  get: (id: string) => get<Installer>(`/installers/${id}`),
  create: (data: Partial<Installer>) => post<Installer>('/installers', data),
  update: (id: string, data: Partial<Installer>) => put<Installer>(`/installers/${id}`, data),
  getSchedule: (id: string, from: string, to: string) =>
    get<Job[]>(`/installers/${id}/schedule`, { params: { from, to } }),
}

// ─── Photos ──────────────────────────────────────────────────────────────────

export const photosApi = {
  list: (jobId: string) => get<JobPhoto[]>(`/jobs/${jobId}/photos`),
  upload: (jobId: string, file: File, phase: 'before' | 'during' | 'after', caption?: string) => {
    const form = new FormData()
    form.append('photo', file)
    form.append('phase', phase)
    if (caption) form.append('caption', caption)
    return client.post<JobPhoto>(`/jobs/${jobId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data)
  },
  delete: (jobId: string, photoId: string) => del<void>(`/jobs/${jobId}/photos/${photoId}`),
}

// ─── Invoices ────────────────────────────────────────────────────────────────

export const invoicesApi = {
  list: (params?: { jobId?: string; status?: string }) =>
    get<Invoice[]>('/invoices', { params }),
  get: (id: string) => get<Invoice>(`/invoices/${id}`),
  generate: (jobId: string, type: 'deposit' | 'balance' | 'full') =>
    post<Invoice>('/invoices', { jobId, type }),
  send: (id: string) => post<Invoice>(`/invoices/${id}/send`),
  previewPdf: (id: string) => `${BASE_URL}/invoices/${id}/pdf`,
  markPaid: (id: string) => patch<Invoice>(`/invoices/${id}/paid`),
}

// ─── Certificates ────────────────────────────────────────────────────────────

export const certificatesApi = {
  list: (jobId: string) => get<Certificate[]>(`/jobs/${jobId}/certificates`),
  generate: (jobId: string, type: string) =>
    post<Certificate>(`/jobs/${jobId}/certificates`, { type }),
  previewPdf: (jobId: string, certId: string) =>
    `${BASE_URL}/jobs/${jobId}/certificates/${certId}/pdf`,
}

// ─── Customers ───────────────────────────────────────────────────────────────

export const customersApi = {
  list: (search?: string) =>
    get<PaginatedResponse<Customer>>('/customers', { params: { search } }),
  get: (id: string) => get<Customer>(`/customers/${id}`),
  create: (data: Partial<Customer>) => post<Customer>('/customers', data),
  getJobs: (id: string) => get<Job[]>(`/customers/${id}/jobs`),
}

// ─── Weather ─────────────────────────────────────────────────────────────────

export const weatherApi = {
  forecast: (suburb: string, postcode: string) =>
    get<{ data: WeatherForecast[] }>(`/weather/${postcode}`, { params: { suburb } })
      .then(res => res.data),
}

// ─── STC Calculator ──────────────────────────────────────────────────────────

export const stcApi = {
  calculate: (systemSizeKw: number, postcode: string) =>
    get<StcCalculation>('/stc/calculate', { params: { systemSizeKw, postcode } }),
}
