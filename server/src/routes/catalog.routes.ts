import { Router } from 'express'
import { getCatalogMedia } from '../controllers/catalog.controller.js'

const router = Router()

router.get('/catalog/:mediaType', getCatalogMedia)

export default router