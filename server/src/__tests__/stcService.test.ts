import { calculateStcs, calculateStcRebate, postcodeToZone, ZONE_DEEMING_YEARS } from '../services/stcService'

describe('postcodeToZone', () => {
  it('maps NT to Zone 1', () => expect(postcodeToZone('0800')).toBe(1))
  it('maps far north QLD to Zone 1', () => expect(postcodeToZone('4870')).toBe(1))
  it('maps coastal QLD to Zone 2', () => expect(postcodeToZone('4000')).toBe(2))
  it('maps WA to Zone 2', () => expect(postcodeToZone('6000')).toBe(2))
  it('maps VIC to Zone 3', () => expect(postcodeToZone('3128')).toBe(3))
  it('maps NSW to Zone 3', () => expect(postcodeToZone('2000')).toBe(3))
  it('maps SA to Zone 3', () => expect(postcodeToZone('5000')).toBe(3))
  it('maps TAS to Zone 4', () => expect(postcodeToZone('7000')).toBe(4))
  it('defaults non-matching postcode to Zone 3', () => expect(postcodeToZone('9999')).toBe(3))
  it('handles non-numeric input gracefully', () => expect(postcodeToZone('abc')).toBe(3))
})

describe('calculateStcs', () => {
  it('calculates STCs for 6.6kW in VIC (Zone 3)', () => {
    const stcs = calculateStcs(6.6, '3128')
    const expected = Math.floor(6.6 * ZONE_DEEMING_YEARS[3] * 1.536)
    expect(stcs).toBe(expected)
  })

  it('calculates higher STCs for Zone 2 vs Zone 3 same system', () => {
    expect(calculateStcs(6.6, '4000')).toBeGreaterThan(calculateStcs(6.6, '3000'))
  })

  it('scales proportionally with system size', () => {
    const s6 = calculateStcs(6, '3000')
    const s12 = calculateStcs(12, '3000')
    // Due to floor(), allow ±1
    expect(s12).toBeGreaterThanOrEqual(s6 * 2 - 1)
    expect(s12).toBeLessThanOrEqual(s6 * 2 + 1)
  })

  it('returns integer STC count', () => {
    const stcs = calculateStcs(6.6, '3000')
    expect(Number.isInteger(stcs)).toBe(true)
  })

  it('handles small systems (1kW)', () => {
    const stcs = calculateStcs(1, '3000')
    expect(stcs).toBeGreaterThan(0)
  })

  it('handles maximum residential system (100kW)', () => {
    expect(() => calculateStcs(100, '3000')).not.toThrow()
  })

  it('throws for 0 kW', () => {
    expect(() => calculateStcs(0, '3000')).toThrow('greater than 0')
  })

  it('throws for negative kW', () => {
    expect(() => calculateStcs(-5, '3000')).toThrow('greater than 0')
  })

  it('throws for system over 100kW', () => {
    expect(() => calculateStcs(100.1, '3000')).toThrow('100 kW')
  })
})

describe('calculateStcRebate', () => {
  it('returns full result object', () => {
    const result = calculateStcRebate(6.6, '3128')
    expect(result).toHaveProperty('systemSizeKw', 6.6)
    expect(result).toHaveProperty('zone', 3)
    expect(result).toHaveProperty('stcCount')
    expect(result).toHaveProperty('unitPriceAud', 38)
    expect(result).toHaveProperty('totalRebateAud')
  })

  it('totalRebateAud = stcCount × unitPriceAud', () => {
    const result = calculateStcRebate(6.6, '3128', 40)
    expect(result.totalRebateAud).toBe(result.stcCount * 40)
  })

  it('uses default unit price of $38', () => {
    const result = calculateStcRebate(6.6, '3128')
    expect(result.unitPriceAud).toBe(38)
  })

  it('accepts custom unit price', () => {
    const result = calculateStcRebate(6.6, '3128', 42)
    expect(result.unitPriceAud).toBe(42)
    expect(result.totalRebateAud).toBe(result.stcCount * 42)
  })
})
