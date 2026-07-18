import { Router } from 'express'
import { getProviderLinksByMedia } from '../controllers/providerLink.controller.js'

const router = Router()

router.get('/links/:mediaType/:tmdbId', getProviderLinksByMedia)

export default router