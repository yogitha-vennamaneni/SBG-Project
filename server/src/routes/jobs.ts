import { Router } from 'express'
import * as jobsController from '../controllers/jobsController'

const router = Router()

router.get('/', jobsController.list)
router.post('/check-conflicts', jobsController.checkConflicts)
router.get('/:id', jobsController.getById)
router.get('/:id/history', jobsController.getHistory)
router.post('/', jobsController.create)
router.patch('/:id/status', jobsController.updateStatus)
router.post('/:id/assign', jobsController.assign)
router.post('/:id/unassign', jobsController.unassign)

export default router
