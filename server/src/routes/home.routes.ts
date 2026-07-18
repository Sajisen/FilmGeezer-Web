import { Router } from 'express'
import { getHomeMedia } from '../controllers/home.controller.js'

const router = Router()

router.get('/home', getHomeMedia)

export default router