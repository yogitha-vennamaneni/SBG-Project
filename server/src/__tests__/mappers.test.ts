import {
  toNum, toISODate, toISODateTime, toHHMM, toStringArray,
  mapCustomer, mapJobWithCustomer, mapInstaller, mapQuote, mapInvoice, mapCertificate, mapEnquiry,
} from '../utils/mappers'

describe('toNum', () => {
  it('returns undefined for null/undefined', () => {
    expect(toNum(null)).toBeUndefined()
    expect(toNum(undefined)).toBeUndefined()
  })
  it('passes numbers through unchanged', () => {
    expect(toNum(6.6)).toBe(6.6)
  })
  it('converts numeric strings (as Postgres NUMERIC comes back)', () => {
    expect(toNum('1234.50')).toBe(1234.5)
  })
  it('converts 0 (falsy but not nullish) correctly', () => {
    expect(toNum(0)).toBe(0)
    expect(toNum('0')).toBe(0)
  })
})

describe('toISODate', () => {
  it('returns undefined for falsy input', () => {
    expect(toISODate(null)).toBeUndefined()
    expect(toISODate(undefined)).toBeUndefined()
    expect(toISODate('')).toBeUndefined()
  })
  it('formats a Date using local getters, not UTC, to avoid an off-by-one day', () => {
    // node-pg parses DATE columns as local-midnight Date objects; using UTC
    // getters here would shift the date by a day outside UTC+0 timezones.
    const d = new Date(2026, 8, 15) // 15 Sep 2026, local midnight (month is 0-indexed)
    expect(toISODate(d)).toBe('2026-09-15')
  })
  it('pads single-digit month and day', () => {
    const d = new Date(2026, 0, 5) // 5 Jan 2026
    expect(toISODate(d)).toBe('2026-01-05')
  })
  it('passes non-Date values through as strings', () => {
    expect(toISODate('2026-09-15')).toBe('2026-09-15')
  })
})

describe('toISODateTime', () => {
  it('returns undefined for falsy input', () => {
    expect(toISODateTime(null)).toBeUndefined()
    expect(toISODateTime(undefined)).toBeUndefined()
  })
  it('converts a Date to an ISO string', () => {
    const d = new Date('2026-09-15T04:30:00.000Z')
    expect(toISODateTime(d)).toBe('2026-09-15T04:30:00.000Z')
  })
  it('passes non-Date values through as strings', () => {
    expect(toISODateTime('2026-09-15T00:00:00Z')).toBe('2026-09-15T00:00:00Z')
  })
})

describe('toHHMM', () => {
  it('returns undefined for falsy input', () => {
    expect(toHHMM(null)).toBeUndefined()
    expect(toHHMM(undefined)).toBeUndefined()
    expect(toHHMM('')).toBeUndefined()
  })
  it('truncates a Postgres TIME string (HH:mm:ss) to HH:mm', () => {
    expect(toHHMM('08:00:00')).toBe('08:00')
  })
  it('leaves an already-short value untouched', () => {
    expect(toHHMM('08:00')).toBe('08:00')
  })
})

describe('toStringArray', () => {
  it('passes a real array through unchanged', () => {
    expect(toStringArray(['solar_installation', 'battery_installation'])).toEqual(['solar_installation', 'battery_installation'])
  })
  it('parses a Postgres array literal string', () => {
    expect(toStringArray('{solar_installation,battery_installation}')).toEqual(['solar_installation', 'battery_installation'])
  })
  it('returns an empty array for an empty Postgres array literal', () => {
    expect(toStringArray('{}')).toEqual([])
  })
  it('returns an empty array for null/undefined/other types', () => {
    expect(toStringArray(null)).toEqual([])
    expect(toStringArray(undefined)).toEqual([])
    expect(toStringArray(42)).toEqual([])
  })
})

describe('mapCustomer', () => {
  it('maps snake_case columns to the camelCase Customer shape', () => {
    const row = {
      id: 'cust-1', first_name: 'James', last_name: 'Nguyen',
      email: 'james@example.com', phone: '0400000000',
      street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108',
      nmi: '6102345678', created_at: new Date('2026-01-01T00:00:00Z'),
    }
    expect(mapCustomer(row)).toEqual({
      id: 'cust-1', firstName: 'James', lastName: 'Nguyen',
      email: 'james@example.com', phone: '0400000000',
      address: { street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108', nmi: '6102345678' },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
  })
  it('omits nmi from address when not present', () => {
    const row = {
      id: 'cust-1', first_name: 'A', last_name: 'B', email: 'a@b.com', phone: '0400000000',
      street: 's', suburb: 'sub', state: 'VIC', postcode: '3000', nmi: null, created_at: new Date(),
    }
    expect(mapCustomer(row).address.nmi).toBeUndefined()
  })
})

describe('mapJobWithCustomer', () => {
  const baseRow = {
    id: 'job-1', quote_id: 'quote-1', customer_id: 'cust-1',
    c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'james@example.com', c_phone: '0400000000',
    c_street: '14 Kookaburra Cres', c_suburb: 'Doncaster', c_state: 'VIC', c_postcode: '3108', c_nmi: null,
    c_created_at: new Date('2026-01-01T00:00:00Z'),
    job_type: 'solar_installation', status: 'scheduled',
    scheduled_date: new Date(2026, 8, 15), scheduled_start_time: '08:00:00',
    estimated_duration: 360, assigned_installers: ['inst-1'],
    street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108', nmi: null,
    notes: null, system_size_kw: '6.6', panel_count: 16,
    created_at: new Date('2026-01-01T00:00:00Z'), updated_at: new Date('2026-01-02T00:00:00Z'),
  }

  it('maps a fully-populated job+customer row', () => {
    const mapped = mapJobWithCustomer(baseRow)
    expect(mapped.id).toBe('job-1')
    expect(mapped.customer).toEqual({
      id: 'cust-1', firstName: 'James', lastName: 'Nguyen', email: 'james@example.com', phone: '0400000000',
      address: { street: '14 Kookaburra Cres', suburb: 'Doncaster', state: 'VIC', postcode: '3108', nmi: undefined },
      createdAt: '2026-01-01T00:00:00.000Z',
    })
    expect(mapped.scheduledDate).toBe('2026-09-15')
    expect(mapped.scheduledStartTime).toBe('08:00')
    expect(mapped.systemSizeKw).toBe(6.6)
    expect(mapped.assignedInstallers).toEqual(['inst-1'])
  })

  it('omits customer when there is no joined customer row (LEFT JOIN miss)', () => {
    const row = { ...baseRow, c_first_name: null, customer_id: null }
    const mapped = mapJobWithCustomer(row)
    expect(mapped.customer).toBeUndefined()
    expect(mapped.customerId).toBeUndefined()
  })

  it('surfaces scheduling-export inline customer fields for jobs without a customer_id', () => {
    const row = {
      ...baseRow, c_first_name: null, customer_id: null,
      customer_name: 'Amelia Kelly', customer_phone: '0416418142', customer_email: 'amelia@example.com',
      job_code: 'J-1001',
    }
    const mapped = mapJobWithCustomer(row)
    expect(mapped.customerName).toBe('Amelia Kelly')
    expect(mapped.customerPhone).toBe('0416418142')
    expect(mapped.customerEmail).toBe('amelia@example.com')
    expect(mapped.jobCode).toBe('J-1001')
  })

  it('falls back to assigned_installer_id when no job_installers rows exist', () => {
    const row = { ...baseRow, assigned_installers: undefined, assigned_installer_id: 'inst-9' }
    expect(mapJobWithCustomer(row).assignedInstallers).toEqual([])
    expect(mapJobWithCustomer(row).assignedInstallerId).toBe('inst-9')
  })

  it('defaults assignedInstallers to an empty array when nothing is assigned', () => {
    const row = { ...baseRow, assigned_installers: undefined, assigned_installer_id: undefined }
    expect(mapJobWithCustomer(row).assignedInstallers).toEqual([])
  })
})

describe('mapInstaller', () => {
  const row = {
    id: 'inst-1', first_name: 'Alice', last_name: 'Smith', email: 'alice@sbg.com.au', phone: '0400000001',
    role: 'electrician', licence_number: 'REC1111', rec_registration: null,
    skills: '{solar_installation,battery_installation}', is_active: true,
    installer_code: 'INS-01', state: 'VIC', home_base: 'Ringwood',
    working_days: '{Mon,Tue,Wed}', shift_start: '07:00:00', shift_end: '17:00:00',
    leave_start: null, leave_end: null,
  }

  it('maps skills from a Postgres array literal', () => {
    expect(mapInstaller(row).skills).toEqual(['solar_installation', 'battery_installation'])
  })

  it('maps availability rows into dayOfWeek/startTime/endTime', () => {
    const availability = [{ day_of_week: 1, start_time: '07:00:00', end_time: '17:00:00' }]
    expect(mapInstaller(row, availability).availability).toEqual([
      { dayOfWeek: 1, startTime: '07:00', endTime: '17:00' },
    ])
  })

  it('defaults to an empty availability array', () => {
    expect(mapInstaller(row).availability).toEqual([])
  })

  it('maps scheduling-export fields', () => {
    const mapped = mapInstaller(row)
    expect(mapped.installerCode).toBe('INS-01')
    expect(mapped.homeBase).toBe('Ringwood')
    expect(mapped.workingDays).toEqual(['Mon', 'Tue', 'Wed'])
    expect(mapped.shiftStart).toBe('07:00')
    expect(mapped.shiftEnd).toBe('17:00')
  })

  it('leaves workingDays undefined when the row has none', () => {
    expect(mapInstaller({ ...row, working_days: null }).workingDays).toBeUndefined()
  })
})

describe('mapQuote', () => {
  const row = {
    id: 'quote-1', enquiry_id: 'enq-1', customer_id: 'cust-1',
    c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'j@x.com', c_phone: '040', c_street: 's',
    c_suburb: 'sub', c_state: 'VIC', c_postcode: '3000', c_nmi: null, c_created_at: new Date(),
    job_type: 'solar_installation', line_items: [{ description: 'Panels', qty: 1, unitPrice: 100, total: 100 }],
    subtotal: '100.00', stc_rebate: '38.00', gst: '10.00', total: '72.00',
    deposit_amount: '14.40', balance_amount: '57.60', valid_until: new Date(2026, 9, 1),
    docsign_status: 'sent', docsign_envelope_id: 'env-1', signed_at: null, created_at: new Date(),
  }

  it('coerces numeric string fields to numbers', () => {
    const mapped = mapQuote(row)
    expect(mapped.subtotal).toBe(100)
    expect(mapped.stcRebate).toBe(38)
    expect(mapped.gst).toBe(10)
    expect(mapped.total).toBe(72)
    expect(mapped.depositAmount).toBe(14.4)
    expect(mapped.balanceAmount).toBe(57.6)
  })

  it('defaults lineItems to an empty array when null', () => {
    expect(mapQuote({ ...row, line_items: null }).lineItems).toEqual([])
  })

  it('omits customer when no customer columns are joined', () => {
    expect(mapQuote({ ...row, c_first_name: null }).customer).toBeUndefined()
  })
})

describe('mapInvoice', () => {
  const row = {
    id: 'inv-1', job_id: 'job-1', customer_id: 'cust-1',
    c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'j@x.com', c_phone: '040', c_street: 's',
    c_suburb: 'sub', c_state: 'VIC', c_postcode: '3000', c_nmi: null, c_created_at: new Date(),
    invoice_number: 'INV-000001', type: 'deposit', line_items: null,
    subtotal: '100.00', gst: '10.00', total: '110.00', due_date: new Date(2026, 9, 1),
    paid_at: null, stripe_payment_link: null, stripe_payment_intent: null,
    status: 'draft', created_at: new Date(),
  }

  it('maps numeric and status fields', () => {
    const mapped = mapInvoice(row)
    expect(mapped.total).toBe(110)
    expect(mapped.status).toBe('draft')
    expect(mapped.invoiceNumber).toBe('INV-000001')
  })

  it('defaults lineItems to an empty array when null', () => {
    expect(mapInvoice(row).lineItems).toEqual([])
  })
})

describe('mapCertificate', () => {
  it('maps CES fields', () => {
    const row = {
      id: 'cert-1', job_id: 'job-1', type: 'CES',
      ces_work_description: 'Installed 6.6kW system', ces_licence_number: 'REC7845', ces_rec_registration: 'A5023451',
      ces_completion_date: new Date(2026, 8, 15), ces_certification_date: new Date(2026, 8, 15),
      stc_panel_serials: null, stc_system_owner: null, stc_install_date: null,
      stc_system_size_kw: null, stc_certificate_qty: null,
      pdf_signed_url: null, generated_at: null, created_at: new Date(),
    }
    const mapped = mapCertificate(row)
    expect(mapped.type).toBe('CES')
    expect(mapped.cesLicenceNumber).toBe('REC7845')
    expect(mapped.cesCompletionDate).toBe('2026-09-15')
    expect(mapped.stcSystemSizeKw).toBeUndefined()
  })

  it('maps STC assignment fields', () => {
    const row = {
      id: 'cert-2', job_id: 'job-1', type: 'STC_assignment',
      ces_work_description: null, ces_licence_number: null, ces_rec_registration: null,
      ces_completion_date: null, ces_certification_date: null,
      stc_panel_serials: ['REC001', 'REC002'], stc_system_owner: 'James Nguyen',
      stc_install_date: new Date(2026, 8, 15), stc_system_size_kw: '6.6', stc_certificate_qty: 16,
      pdf_signed_url: 'https://example.com/cert.pdf', generated_at: new Date(), created_at: new Date(),
    }
    const mapped = mapCertificate(row)
    expect(mapped.stcPanelSerials).toEqual(['REC001', 'REC002'])
    expect(mapped.stcSystemSizeKw).toBe(6.6)
    expect(mapped.pdfUrl).toBe('https://example.com/cert.pdf')
  })
})

describe('mapEnquiry', () => {
  const row = {
    id: 'enq-1', customer_id: 'cust-1',
    c_first_name: 'James', c_last_name: 'Nguyen', c_email: 'j@x.com', c_phone: '040', c_street: 's',
    c_suburb: 'sub', c_state: 'VIC', c_postcode: '3000', c_nmi: null, c_created_at: new Date(),
    job_type: 'solar_installation', description: 'New system', roof_type: 'tile',
    system_size_kw: '6.6', panel_count: 16, battery_capacity_kwh: null, existing_solar_kw: null,
    ev_charger_amps: null, phase_type: null, roof_area: null,
    weather_risk: 'low', weather_note: null, status: 'new', created_at: new Date(),
  }

  it('maps numeric fields and defaults description', () => {
    const mapped = mapEnquiry(row)
    expect(mapped.systemSizeKw).toBe(6.6)
    expect(mapped.description).toBe('New system')
  })

  it('defaults description to empty string when null', () => {
    expect(mapEnquiry({ ...row, description: null }).description).toBe('')
  })
})
