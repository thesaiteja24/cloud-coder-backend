// routes/indexRoutes.js
import express from 'express'
import passport from 'passport'
import { body, validationResult } from 'express-validator'
import {
  signup,
  login,
  githubCallback,
  googleCallback,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js'
import { logWarn } from '../utils/logger.js'

const router = express.Router()

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    logWarn('Validation errors', { errors: errors.array() }, req)
    return res
      .status(400)
      .json({ message: 'Validation error', errors: errors.array() })
  }
  next()
}

router.post(
  '/signup',
  [
    body('username')
      .isAlphanumeric()
      .trim()
      .escape()
      .notEmpty()
      .withMessage('Username is required'),
    body('name').trim().escape().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  signup
)

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
)

router.get(
  '/auth/github',
  passport.authenticate('github', { scope: ['user:email'] })
)
router.get(
  '/auth/github/callback',
  passport.authenticate('github', { session: false }),
  githubCallback
)
router.get(
  '/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)
router.get(
  '/auth/google/callback',
  passport.authenticate('google', { session: false }),
  googleCallback
)

router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  refreshToken
)

router.post('/logout', passport.authenticate('jwt', { session: false }), logout)

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Invalid email')],
  validate,
  forgotPassword
)

router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Token is required'),
    body('id').notEmpty().withMessage('User ID is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  validate,
  resetPassword
)

export default router
