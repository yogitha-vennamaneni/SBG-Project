import { Request, Response } from 'express'
import { z } from 'zod'
import { calculateStcRebate } from '../services/stcService'

const CalcSchema = z.object({
  systemKw: z.number().positive(),
  postcode: z.string().length(4),
  unitPriceAud: z.number().positive().optional(),
})

/**
 * POST /api/stc/calculate
 * Body: { systemKw: number, postcode: string, unitPriceAud?: number }
 */
export function calculate(req: Request, res: Response) {
  try {
    const { systemKw, postcode, unitPriceAud } = CalcSchema.parse(req.body)
    const result = calculateStcRebate(systemKw, postcode, unitPriceAud)
    res.json({ data: result })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: err.errors })
    }
    const message = err instanceof Error ? err.message : 'Calculation failed'
    res.status(400).json({ error: message })
  }
}
