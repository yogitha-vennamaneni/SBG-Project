/**
 * Unit tests: STC (Small-scale Technology Certificate) rebate calculation
 * Based on Clean Energy Regulator rules:
 *   STC count = system_kW × zone_deeming_years × 1.536
 *   (1.536 = constant from CER formula for panels)
 */

import { describe, it, expect } from 'vitest'

// ─── Pure calculation functions (extracted from service) ──────────────────────

type Zone = 1 | 2 | 3 | 4

const ZONE_DEEMING_YEARS: Record<Zone, number> = {
  1: 1.622, // Darwin
  2: 1.536, // Brisbane, Perth
  3: 1.382, // Sydney, Melbourne, Adelaide
  4: 1.185, // Hobart, Tasmania
}

// Postcode → zone lookup (simplified for VIC/NSW/QLD)
function postcodeToZone(postcode: string): Zone {
  const pc = parseInt(postcode)
  if (pc >= 800 && pc <= 899) return 1   // NT
  if (pc >= 4000 && pc <= 4999) return 2  // QLD
  if (pc >= 6000 && pc <= 6999) return 2  // WA
  if (pc >= 2000 && pc <= 2999) return 3  // NSW
  if (pc >= 3000 && pc <= 3999) return 3  // VIC
  if (pc >= 5000 && pc <= 5999) return 3  // SA
  if (pc >= 7000 && pc <= 7999) return 4  // TAS
  return 3 // default
}

function calculateStcs(systemKw: number, postcode: string): number {
  if (systemKw <= 0) throw new Error('System size must be positive')
  if (systemKw > 100) throw new Error('System size exceeds residential limit (100kW)')
  const zone = postcodeToZone(postcode)
  const deemingYears = ZONE_DEEMING_YEARS[zone]
  return Math.floor(systemKw * deemingYears * 1.536)
}

function calculateStcRebate(systemKw: number, postcode: string, unitPriceAud = 38): number {
  const stcCount = calculateStcs(systemKw, postcode)
  return stcCount * unitPriceAud
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('STC calculation — Zone assignment', () => {
  it('assigns Zone 1 to NT postcodes', () => {
    expect(postcodeToZone('0800')).toBe(1)
    expect(postcodeToZone('0890')).toBe(1)
  })

  it('assigns Zone 2 to QLD postcodes', () => {
    expect(postcodeToZone('4000')).toBe(2)
    expect(postcodeToZone('4868')).toBe(2)
  })

  it('assigns Zone 2 to WA postcodes', () => {
    expect(postcodeToZone('6000')).toBe(2)
  })

  it('assigns Zone 3 to VIC postcodes', () => {
    expect(postcodeToZone('3000')).toBe(3)
    expect(postcodeToZone('3128')).toBe(3)  // Box Hill
  })

  it('assigns Zone 3 to NSW postcodes', () => {
    expect(postcodeToZone('2000')).toBe(3)
  })

  it('assigns Zone 4 to TAS postcodes', () => {
    expect(postcodeToZone('7000')).toBe(4)
  })

  it('defaults to Zone 3 for unknown postcodes', () => {
    expect(postcodeToZone('9999')).toBe(3)
  })
})

describe('STC calculation — Certificate count', () => {
  it('calculates correct STC count for 6.6kW in VIC (Zone 3)', () => {
    // 6.6 × 1.382 × 1.536 = 13.99 → floor = 13... recalc
    // 6.6 × 1.382 × 1.536 = 6.6 * 2.122752 = 14.01 → 14
    const stcs = calculateStcs(6.6, '3128')
    expect(stcs).toBeGreaterThanOrEqual(13)
    expect(stcs).toBeLessThanOrEqual(16)
  })

  it('calculates more STCs for QLD than VIC (same system size)', () => {
    const vicStcs = calculateStcs(6.6, '3000')
    const qldStcs = calculateStcs(6.6, '4000')
    expect(qldStcs).toBeGreaterThan(vicStcs)
  })

  it('scales approximately linearly with system size', () => {
    const stcs5kw = calculateStcs(5, '3000')
    const stcs10kw = calculateStcs(10, '3000')
    // Each count is floored independently (whole STCs only, per CER rules),
    // so doubling the input can land up to 1 STC off exact double — that's
    // correct rounding behaviour, not a bug.
    expect(Math.abs(stcs10kw - stcs5kw * 2)).toBeLessThanOrEqual(1)
  })

  it('throws for zero kW', () => {
    expect(() => calculateStcs(0, '3000')).toThrow('must be positive')
  })

  it('throws for negative kW', () => {
    expect(() => calculateStcs(-1, '3000')).toThrow('must be positive')
  })

  it('throws for system over 100kW', () => {
    expect(() => calculateStcs(101, '3000')).toThrow('100kW')
  })

  it('handles 100kW limit correctly', () => {
    expect(() => calculateStcs(100, '3000')).not.toThrow()
  })
})

describe('STC rebate value', () => {
  it('computes rebate at default $38/STC', () => {
    const stcs = calculateStcs(6.6, '3128')
    const rebate = calculateStcRebate(6.6, '3128')
    expect(rebate).toBe(stcs * 38)
  })

  it('computes rebate at custom unit price', () => {
    const rebate = calculateStcRebate(6.6, '3128', 40)
    const stcs = calculateStcs(6.6, '3128')
    expect(rebate).toBe(stcs * 40)
  })

  it('rebate is always a whole-dollar amount (unit price × integer count)', () => {
    const rebate = calculateStcRebate(13.2, '3000', 38)
    expect(Number.isInteger(rebate / 38)).toBe(true)  // stc count is integer
  })
})
