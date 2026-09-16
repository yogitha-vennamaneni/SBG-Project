import { Router } from 'express'
import * as invoicesController from '../controllers/invoicesController'
import { requireRole } from '../middleware/auth'

const router = Router()

router.get('/', invoicesController.list)
router.get('/:id', invoicesController.getById)
router.get('/:id/pdf', invoicesController.getPdf)
// Billing is an office/admin action — field technicians can view invoices but not issue them.
router.post('/', requireRole('admin'), invoicesController.create)

export default router
