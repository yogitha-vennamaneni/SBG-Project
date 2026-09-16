/**
 * STC (Small-scale Technology Certificate) calculation service.
 * Reference: Clean Energy Regulator — Renewable Energy (Electricity) Act 2000
 */

export type Zone = 1 | 2 | 3 | 4

// Zone deeming years multiplied into the STC formula
export const ZONE_DEEMING_YEARS: Record<Zone, number> = {
  1: 1.622,  // NT, far north QLD
  2: 1.536,  // Most of QLD, coastal WA
  3: 1.382,  // NSW, VIC, SA, ACT, SE QLD
  4: 1.185,  // TAS
}

// Simplified postcode → zone mapping
export function postcodeToZone(postcode: string): Zone {
  const pc = parseInt(postcode, 10)
  if (isNaN(pc)) return 3
  if (pc >= 800 && pc <= 899) return 1      // NT
  if (pc >= 4700 && pc <= 4999) return 1    // Far North QLD
  if (pc >= 4000 && pc <= 4699) return 2    // SE QLD / Coastal QLD
  if (pc >= 6000 && pc <= 6999) return 2    // WA (coastal)
  if (pc >= 2000 && pc <= 2999) return 3    // NSW
  if (pc >= 3000 && pc <= 3999) return 3    // VIC
  if (pc >= 5000 && pc <= 5999) return 3    // SA
  if (pc >= 2600 && pc <= 2618) return 3    // ACT
  if (pc >= 7000 && pc <= 7999) return 4    // TAS
  return 3
}

export interface StcResult {
  systemSizeKw: number
  zone: Zone
  deemingYears: number
  stcCount: number
  unitPriceAud: number
  totalRebateAud: number
}

/**
 * Calculates the number of STCs for a given solar system.
 * Formula: STCs = systemKW × deemingYears × 1.536
 * The 1.536 constant represents an approximation of panel output
 * at standard test conditions used by the CER.
 */
export function calculateStcs(systemKw: number, postcode: string): number {
  if (systemKw <= 0) throw new Error('System size must be greater than 0 kW')
  if (systemKw > 100) throw new Error('System size exceeds residential limit of 100 kW')
  const zone = postcodeToZone(postcode)
  const deemingYears = ZONE_DEEMING_YEARS[zone]
  return Math.floor(systemKw * deemingYears * 1.536)
}

export function calculateStcRebate(
  systemKw: number,
  postcode: string,
  unitPriceAud = 38
): StcResult {
  const zone = postcodeToZone(postcode)
  const deemingYears = ZONE_DEEMING_YEARS[zone]
  const stcCount = calculateStcs(systemKw, postcode)
  return {
    systemSizeKw: systemKw,
    zone,
    deemingYears,
    stcCount,
    unitPriceAud,
    totalRebateAud: stcCount * unitPriceAud,
  }
}
