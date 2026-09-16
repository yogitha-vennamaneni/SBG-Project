import { Router } from 'express'
import * as certificatesController from '../controllers/certificatesController'

const router = Router({ mergeParams: true })

router.get('/', certificatesController.list)
router.post('/', certificatesController.create)
router.get('/:certId/pdf', certificatesController.getPdf)

export default router
