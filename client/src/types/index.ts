// ─── Enums ────────────────────────────────────────────────────────────────────

export type JobType =
  | 'solar_installation'
  | 'battery_installation'
  | 'ev_charger'
  | 'roof_renovation'
  | 'solar_adjustment'
  // scheduling-export labels — same DB job_type enum, used by imported jobs
  | 'Battery install'
  | 'Solar + battery'
  | 'Battery upgrade'

export type JobStatus =
  | 'enquiry'
  | 'quoted'
  | 'quote_sent'
  | 'quote_accepted'
  | 'quote_declined'
  | 'deposit_paid'
  | 'scheduled'
  | 'in_progress'
  | 'completed'
  | 'invoiced'
  | 'paid'
  | 'cancelled'
  | 'unscheduled'
  | 'confirmed'

export type InstallerRole = 'installer' | 'electrician' | 'supervisor'

export type CertificateType = 'CES' | 'STC_assignment' | 'service_report'

// ─── Customer ─────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  address: Address
  createdAt: string
}

export interface Address {
  street: string
  suburb: string
  state: string
  postcode: string
  nmi?: string // National Metering Identifier
}

// ─── Enquiry ──────────────────────────────────────────────────────────────────

export interface Enquiry {
  id: string
  customerId: string
  customer?: Customer
  jobType: JobType
  description: string
  // Solar installation fields
  roofType?: 'tile' | 'tin' | 'flat' | 'tilt'
  systemSizeKw?: number
  panelCount?: number
  // Battery fields
  batteryCapacityKwh?: number
  existingSolarKw?: number
  // EV charger fields
  evChargerAmps?: 16 | 32
  phaseType?: 'single' | 'three'
  // Roof renovation fields
  roofArea?: number
  renovationType?: string
  // Weather risk
  weatherRisk?: 'low' | 'medium' | 'high'
  weatherNote?: string
  status: 'new' | 'reviewed' | 'quoted'
  createdAt: string
}

// ─── Quote ────────────────────────────────────────────────────────────────────

export interface QuoteLineItem {
  description: string
  qty: number
  unitPrice: number
  total: number
  isStcRebate?: boolean
}

export interface Quote {
  id: string
  enquiryId: string
  customerId: string
  customer?: Customer
  jobType: JobType
  lineItems: QuoteLineItem[]
  subtotal: number
  stcRebate: number
  gst: number
  total: number
  depositAmount: number     // 20% of total
  balanceAmount: number     // 80% of total
  validUntil: string
  docSignStatus: 'draft' | 'sent' | 'viewed' | 'signed' | 'declined' | 'expired'
  docSignEnvelopeId?: string
  signedAt?: string
  createdAt: string
}

// ─── Job ──────────────────────────────────────────────────────────────────────

export interface Job {
  id: string
  quoteId?: string
  // Nullable: scheduling-export jobs carry inline customerName/customerPhone/
  // customerEmail instead of a link to the customers table.
  customerId?: string
  customer?: Customer
  jobType: JobType
  status: JobStatus
  scheduledDate?: string
  scheduledStartTime?: string
  estimatedDuration: number   // minutes
  assignedInstallers: string[]
  installers?: Installer[]
  address: Address
  notes?: string
  systemSizeKw?: number
  panelCount?: number
  panelModel?: string
  inverterModel?: string
  batteryModel?: string
  weatherRisk?: 'low' | 'medium' | 'high'
  completedAt?: string
  createdAt: string
  updatedAt: string
  // ─── scheduling export fields ────────────────────────────────────────────
  jobCode?: string            // e.g. 'J-1001'
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  scheduledStart?: string     // ISO 8601 — alternate to scheduledDate/scheduledStartTime
  durationBlocks?: number     // one block = one hour
  assignedInstallerId?: string
}

export interface JobStatusHistory {
  id: string
  jobId: string
  status: JobStatus
  note?: string
  updatedBy: string
  createdAt: string
}

// ─── Installer ────────────────────────────────────────────────────────────────

export interface Installer {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  role: InstallerRole
  licenceNumber?: string     // Electrical licence
  recRegistration?: string   // REC/CEC accreditation
  skills: JobType[]
  availability: InstallerAvailability[]
  avatarUrl?: string
  isActive: boolean
  // ─── scheduling export fields ────────────────────────────────────────────
  installerCode?: string    // e.g. 'INS-01'
  state?: string            // installers do not cross state lines
  homeBase?: string         // suburb they start each day from
  workingDays?: string[]    // e.g. ['Mon','Tue','Wed','Thu','Fri']
  shiftStart?: string       // HH:mm, local time
  shiftEnd?: string         // HH:mm, local time
  leaveStart?: string       // ISO date, inclusive. Absent if none in this period
  leaveEnd?: string
}

export interface InstallerAvailability {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6
  startTime: string   // HH:mm
  endTime: string     // HH:mm
}

// ─── Job Photo ────────────────────────────────────────────────────────────────

export interface JobPhoto {
  id: string
  jobId: string
  uploadedBy: string
  url: string
  thumbnailUrl?: string
  caption?: string
  phase: 'before' | 'during' | 'after'
  createdAt: string
}

// ─── Invoice ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string
  jobId: string
  customerId: string
  customer?: Customer
  invoiceNumber: string
  type: 'deposit' | 'balance' | 'full'
  lineItems: QuoteLineItem[]
  subtotal: number
  gst: number
  total: number
  dueDate: string
  paidAt?: string
  stripePaymentLinkUrl?: string
  stripePaymentIntentId?: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'void'
  createdAt: string
}

// ─── Certificate ──────────────────────────────────────────────────────────────

export interface Certificate {
  id: string
  jobId: string
  type: CertificateType
  // CES fields
  cesWorkDescription?: string
  cesLicenceNumber?: string
  cesRecRegistration?: string
  cesCompletionDate?: string
  cesCertificationDate?: string
  // STC Assignment
  stcPanelSerials?: string[]
  stcSystemOwnerName?: string
  stcInstallationDate?: string
  stcSystemSizeKw?: number
  stcCertificateQuantity?: number
  pdfUrl?: string
  generatedAt?: string
  createdAt: string
}

// ─── InstallerExportRow (scheduling export schema) ─────────────────────────────
// Matches database/migrations/001_initial.sql `installers` table — installers.csv

export interface InstallerExportRow {
  id: string           // installer_id, e.g. 'INS-01'
  name: string
  phone: string
  state: string         // installers do not cross state lines
  homeBase: string      // suburb they start each day from
  workingDays: string[] // e.g. ['Mon','Tue','Wed','Thu','Fri']
  shiftStart: string    // HH:mm, local time
  shiftEnd: string      // HH:mm, local time
  leaveStart?: string   // ISO date, inclusive. Absent if none in this period
  leaveEnd?: string
}

// ─── ScheduledJob (scheduling export schema) ───────────────────────────────────
// Matches database/migrations/001_initial.sql `jobs` table — jobs.csv

export type ScheduledJobType = 'Battery install' | 'Solar + battery' | 'Battery upgrade'

export type ScheduledJobStatus = 'unscheduled' | 'scheduled' | 'confirmed' | 'cancelled'

export interface ScheduledJob {
  id: string              // job_id, e.g. 'J-1001'
  customerName: string
  customerPhone: string
  customerEmail: string
  siteAddress: string
  suburb: string
  state: string
  postcode: string
  jobType: ScheduledJobType
  batteryModel: string     // battery capacity being installed
  scheduledStart?: string  // ISO 8601. Absent if not yet scheduled
  durationBlocks: number   // one block = one hour
  status: ScheduledJobStatus
  assignedInstallerId?: string // links to InstallerExportRow.id. Absent if unassigned
  notes?: string
  createdAt: string        // date the job was created in the CRM
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

export interface SchedulerEvent {
  id: string
  title: string
  start: Date
  end: Date
  job: Job
  resource?: string
}

export interface ConflictCheckResult {
  hasConflict: boolean
  conflictingJobs?: Job[]
  reason?: string
}

// ─── STC Calculation ─────────────────────────────────────────────────────────

export interface StcCalculation {
  systemSizeKw: number
  zone: 1 | 2 | 3 | 4
  yearsDeemedFrom: number
  stcCount: number
  stcUnitPrice: number
  totalRebate: number
}

// ─── API responses ────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

export interface WeatherForecast {
  date: string
  condition: string
  tempMaxC: number
  windSpeedKmh: number
  rainChancePct: number
  risk: 'low' | 'medium' | 'high'
  advisories: string[]
}
