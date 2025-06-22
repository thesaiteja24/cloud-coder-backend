import express from 'express'
import passport from 'passport'
import {
  signup,
  login,
  githubCallback,
  googleCallback,
  refreshToken,
} from '../controllers/authController.js'

const router = express.Router()

router.post('/signup', signup)
router.post('/login', login)
router.get(
  '/github',
  passport.authenticate('github', { scope: ['user:email'] })
)
router.get(
  '/github/callback',
  passport.authenticate('github', { session: false }),
  githubCallback
)
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
)
router.post('/refresh-token', refreshToken)

export default router
