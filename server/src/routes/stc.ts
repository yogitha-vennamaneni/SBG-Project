import { Router } from 'express'
import * as stcController from '../controllers/stcController'

const router = Router()

router.post('/calculate', stcController.calculate)

export default router
