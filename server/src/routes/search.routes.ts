import { Router } from 'express'
import { searchMedia } from '../controllers/search.controller.js'
import { publicSearchRateLimit } from '../middleware/publicApiRateLimit.middleware.js'

const router = Router()

router.get('/search', publicSearchRateLimit, searchMedia)

export default router