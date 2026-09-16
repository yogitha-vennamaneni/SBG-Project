/**
 * Row → API shape mappers. The DB uses snake_case columns and returns
 * NUMERIC as strings / DATE as UTC-midnight Date objects (node-postgres
 * defaults) — these helpers normalize that into the camelCase JSON shape
 * the client's types/index.ts expects.
 */

export function toNum(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined
  return typeof v === 'number' ? v : Number(v)
}

export function toISODate(v: unknown): string | undefined {
  if (!v) return undefined
  if (v instanceof Date) {
    // node-pg parses DATE columns as local-midnight Date objects, so we must
    // read the calendar date back with local getters — using UTC getters
    // (or toLocaleString()) shifts the date by a day outside UTC+0 timezones.
    const y = v.getFullYear()
    const m = String(v.getMonth() + 1).padStart(2, '0')
    const d = String(v.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  return String(v)
}

export function toISODateTime(v: unknown): string | undefined {
  if (!v) return undefined
  return v instanceof Date ? v.toLocaleString() : String(v)
}

export function toHHMM(v: unknown): string | undefined {
  if (!v) return undefined
  return String(v).slice(0, 5)
}

/**
 * node-postgres only auto-parses built-in array OIDs. Custom enum arrays
 * (e.g. job_type[]) come back as a raw Postgres array literal string like
 * "{solar_installation,battery_installation}" — parse those by hand.
 */
export function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v
  if (typeof v === 'string') {
    const trimmed = v.replace(/^\{/, '').replace(/\}$/, '')
    return trimmed.length ? trimmed.split(',') : []
  }
  return []
}

export function mapCustomer(row: any) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    address: {
      street: row.street,
      suburb: row.suburb,
      state: row.state,
      postcode: row.postcode,
      nmi: row.nmi ?? undefined,
    },
    createdAt: toISODateTime(row.created_at),
  }
}

/** Maps a job row joined with customer columns aliased as c_* */
export function mapJobWithCustomer(row: any) {
  return {
    id: row.id,
    quoteId: row.quote_id ?? undefined,
    // customer_id is nullable — scheduling-export jobs carry inline customer_name/
    // customer_phone/customer_email instead of a customers-table link.
    customerId: row.customer_id ?? undefined,
    customer: row.c_first_name
      ? {
          id: row.customer_id,
          firstName: row.c_first_name,
          lastName: row.c_last_name,
          email: row.c_email,
          phone: row.c_phone,
          address: {
            street: row.c_street,
            suburb: row.c_suburb,
            state: row.c_state,
            postcode: row.c_postcode,
            nmi: row.c_nmi ?? undefined,
          },
          createdAt: toISODateTime(row.c_created_at),
        }
      : undefined,
    jobCode: row.job_code ?? undefined,
    customerName: row.customer_name ?? undefined,
    customerPhone: row.customer_phone ?? undefined,
    customerEmail: row.customer_email ?? undefined,
    jobType: row.job_type,
    status: row.status,
    scheduledDate: toISODate(row.scheduled_date),
    scheduledStartTime: toHHMM(row.scheduled_start_time),
    scheduledStart: toISODateTime(row.scheduled_start),
    durationBlocks: row.duration_blocks ?? undefined,
    estimatedDuration: row.estimated_duration,
    assignedInstallers: row.assigned_installers ?? [],
    assignedInstallerId: row.assigned_installer_id ?? undefined,
    address: {
      street: row.street,
      suburb: row.suburb,
      state: row.state,
      postcode: row.postcode,
      nmi: row.nmi ?? undefined,
    },
    notes: row.notes ?? undefined,
    systemSizeKw: toNum(row.system_size_kw),
    panelCount: row.panel_count ?? undefined,
    panelModel: row.panel_model ?? undefined,
    inverterModel: row.inverter_model ?? undefined,
    batteryModel: row.battery_model ?? undefined,
    weatherRisk: row.weather_risk ?? undefined,
    completedAt: toISODateTime(row.completed_at),
    createdAt: toISODateTime(row.created_at),
    updatedAt: toISODateTime(row.updated_at),
  }
}

export function mapInstaller(row: any, availability: any[] = []) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    role: row.role,
    licenceNumber: row.licence_number ?? undefined,
    recRegistration: row.rec_registration ?? undefined,
    skills: toStringArray(row.skills),
    availability: availability.map(a => ({
      dayOfWeek: a.day_of_week,
      startTime: toHHMM(a.start_time),
      endTime: toHHMM(a.end_time),
    })),
    isActive: row.is_active,
    // scheduling export fields
    installerCode: row.installer_code ?? undefined,
    state: row.state ?? undefined,
    homeBase: row.home_base ?? undefined,
    workingDays: row.working_days ? toStringArray(row.working_days) : undefined,
    shiftStart: toHHMM(row.shift_start),
    shiftEnd: toHHMM(row.shift_end),
    leaveStart: toISODate(row.leave_start),
    leaveEnd: toISODate(row.leave_end),
  }
}

export function mapQuote(row: any) {
  return {
    id: row.id,
    enquiryId: row.enquiry_id ?? undefined,
    customerId: row.customer_id,
    customer: row.c_first_name
      ? {
          id: row.customer_id,
          firstName: row.c_first_name,
          lastName: row.c_last_name,
          email: row.c_email,
          phone: row.c_phone,
          address: {
            street: row.c_street,
            suburb: row.c_suburb,
            state: row.c_state,
            postcode: row.c_postcode,
            nmi: row.c_nmi ?? undefined,
          },
          createdAt: toISODateTime(row.c_created_at),
        }
      : undefined,
    jobType: row.job_type,
    lineItems: row.line_items ?? [],
    subtotal: toNum(row.subtotal),
    stcRebate: toNum(row.stc_rebate),
    gst: toNum(row.gst),
    total: toNum(row.total),
    depositAmount: toNum(row.deposit_amount),
    balanceAmount: toNum(row.balance_amount),
    validUntil: toISODate(row.valid_until),
    docSignStatus: row.docsign_status,
    docSignEnvelopeId: row.docsign_envelope_id ?? undefined,
    signedAt: toISODateTime(row.signed_at),
    createdAt: toISODateTime(row.created_at),
  }
}

export function mapInvoice(row: any) {
  return {
    id: row.id,
    jobId: row.job_id,
    customerId: row.customer_id,
    customer: row.c_first_name
      ? {
          id: row.customer_id,
          firstName: row.c_first_name,
          lastName: row.c_last_name,
          email: row.c_email,
          phone: row.c_phone,
          address: {
            street: row.c_street,
            suburb: row.c_suburb,
            state: row.c_state,
            postcode: row.c_postcode,
            nmi: row.c_nmi ?? undefined,
          },
          createdAt: toISODateTime(row.c_created_at),
        }
      : undefined,
    invoiceNumber: row.invoice_number,
    type: row.type,
    lineItems: row.line_items ?? [],
    subtotal: toNum(row.subtotal),
    gst: toNum(row.gst),
    total: toNum(row.total),
    dueDate: toISODate(row.due_date),
    paidAt: toISODateTime(row.paid_at),
    stripePaymentLinkUrl: row.stripe_payment_link ?? undefined,
    stripePaymentIntentId: row.stripe_payment_intent ?? undefined,
    status: row.status,
    createdAt: toISODateTime(row.created_at),
  }
}

export function mapCertificate(row: any) {
  return {
    id: row.id,
    jobId: row.job_id,
    type: row.type,
    cesWorkDescription: row.ces_work_description ?? undefined,
    cesLicenceNumber: row.ces_licence_number ?? undefined,
    cesRecRegistration: row.ces_rec_registration ?? undefined,
    cesCompletionDate: toISODate(row.ces_completion_date),
    cesCertificationDate: toISODate(row.ces_certification_date),
    stcPanelSerials: row.stc_panel_serials ?? undefined,
    stcSystemOwnerName: row.stc_system_owner ?? undefined,
    stcInstallationDate: toISODate(row.stc_install_date),
    stcSystemSizeKw: toNum(row.stc_system_size_kw),
    stcCertificateQuantity: row.stc_certificate_qty ?? undefined,
    pdfUrl: row.pdf_signed_url ?? undefined,
    generatedAt: toISODateTime(row.generated_at),
    createdAt: toISODateTime(row.created_at),
  }
}

export function mapEnquiry(row: any) {
  return {
    id: row.id,
    customerId: row.customer_id,
    customer: row.c_first_name
      ? {
          id: row.customer_id,
          firstName: row.c_first_name,
          lastName: row.c_last_name,
          email: row.c_email,
          phone: row.c_phone,
          address: {
            street: row.c_street,
            suburb: row.c_suburb,
            state: row.c_state,
            postcode: row.c_postcode,
            nmi: row.c_nmi ?? undefined,
          },
          createdAt: toISODateTime(row.c_created_at),
        }
      : undefined,
    jobType: row.job_type,
    description: row.description ?? '',
    roofType: row.roof_type ?? undefined,
    systemSizeKw: toNum(row.system_size_kw),
    panelCount: row.panel_count ?? undefined,
    batteryCapacityKwh: toNum(row.battery_capacity_kwh),
    existingSolarKw: toNum(row.existing_solar_kw),
    evChargerAmps: row.ev_charger_amps ?? undefined,
    phaseType: row.phase_type ?? undefined,
    roofArea: toNum(row.roof_area),
    weatherRisk: row.weather_risk ?? undefined,
    weatherNote: row.weather_note ?? undefined,
    status: row.status,
    createdAt: toISODateTime(row.created_at),
  }
}
