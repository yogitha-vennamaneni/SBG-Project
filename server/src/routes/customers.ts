import { Router } from 'express'
import * as customersController from '../controllers/customersController'

const router = Router()

router.get('/', customersController.list)
router.get('/:id', customersController.getById)
router.get('/:id/jobs', customersController.getJobs)
router.post('/', customersController.create)
router.put('/:id', customersController.update)

export default router
