import { Router } from 'express'
import { searchMedia } from '../controllers/search.controller.js'

const router = Router()

router.get('/search', searchMedia)

export default router