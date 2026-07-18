import { Router } from 'express'
import { getMovieCollectionPage } from '../controllers/movieCollections.controller.js'

const router = Router()

router.get(
  '/collections/movies',
  getMovieCollectionPage,
)

export default router