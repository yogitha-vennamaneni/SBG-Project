import { Router } from 'express'
import * as enquiriesController from '../controllers/enquiriesController'

const router = Router()

router.get('/', enquiriesController.list)
router.get('/:id', enquiriesController.getById)
router.post('/', enquiriesController.create)
router.put('/:id', enquiriesController.update)

export default router
