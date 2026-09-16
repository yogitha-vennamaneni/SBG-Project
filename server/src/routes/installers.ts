import { Router } from 'express'
import * as installersController from '../controllers/installersController'

const router = Router()

router.get('/', installersController.list)
router.get('/:id', installersController.getById)
router.get('/:id/schedule', installersController.getSchedule)
router.post('/', installersController.create)
router.post('/availability-check', installersController.availabilityCheck)
router.put('/:id', installersController.update)

export default router
