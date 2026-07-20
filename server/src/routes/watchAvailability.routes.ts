import { Router } from 'express'
import { getMediaWatchAvailability } from '../controllers/watchAvailability.controller.js'

const router = Router()

router.get(
  '/media/:mediaType/:tmdbId/watch-availability',
  getMediaWatchAvailability,
)

export default router