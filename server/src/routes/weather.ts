import { Router } from 'express'
import * as weatherController from '../controllers/weatherController'

const router = Router()

router.get('/:postcode', weatherController.getForecast)

export default router
