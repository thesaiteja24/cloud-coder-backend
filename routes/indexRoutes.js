import express from 'express'
import authRoutes from './authRoutes.js'
import rateLimit from 'express-rate-limit'

const router = express.Router()

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per IP
  message: { message: 'Too many attempts, please try again after 15 minutes' },
})

router.use('/auth', authRoutes)

export default router
