import { Router } from 'express'
import { browseMedia } from '../controllers/browse.controller.js'

const router = Router()

router.get('/browse/:mediaType/:category', browseMedia)

export default router