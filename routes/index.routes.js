import express from 'express'
import authRoutes from './auth.routes.js'
import workSpaceRoutes from './wokrspace.routes.js'
import rateLimit from 'express-rate-limit'

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { message: 'Too many attempts, please try again after 15 minutes' },
})

router.use('/auth', authLimiter, authRoutes)
router.use('/workspace', workSpaceRoutes)

export default router
