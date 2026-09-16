import { Router } from 'express'
import * as quotesController from '../controllers/quotesController'

const router = Router()

router.get('/', quotesController.list)
router.get('/:id', quotesController.getById)
router.post('/', quotesController.create)
router.put('/:id', quotesController.update)
router.get('/:id/pdf', quotesController.getPdf)
router.post('/:id/send', quotesController.send)

export default router
