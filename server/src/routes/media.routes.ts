import { Router } from 'express'
import { getMediaByTmdbId } from '../controllers/media.controller.js'

const router = Router()

router.get('/media/:mediaType/:tmdbId', getMediaByTmdbId)

export default router