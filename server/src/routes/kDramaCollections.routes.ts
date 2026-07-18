import { Router } from 'express'
import { getKDramaCollectionPage } from '../controllers/kDramaCollections.controller.js'

const router = Router()

router.get(
  '/collections/k-drama',
  getKDramaCollectionPage,
)

export default router