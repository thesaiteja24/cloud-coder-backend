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

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, name, email, password]
 *             properties:
 *               username:
 *                 type: string
 *                 description: Alphanumeric username
 *               name:
 *                 type: string
 *                 description: Full name
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: Password (min 6 characters)
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: User created successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         profilePic:
 *                           type: string
 *       400:
 *         description: Validation error or duplicate email/username
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user with email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Login successful
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         username:
 *                           type: string
 *                         name:
 *                           type: string
 *                         email:
 *                           type: string
 *                         profilePic:
 *                           type: string
 *       400:
 *         description: Invalid email or password
 *       500:
 *         description: Server error
 */
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Log out user by invalidating refresh token
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/logout', passport.authenticate('jwt', { session: false }), logout)

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password reset email sent
 *       400:
 *         description: Invalid email
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Invalid email')],
  validate,
  forgotPassword
)

/**
 * @swagger
 * /auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, id, password]
 *             properties:
 *               token:
 *                 type: string
 *               id:
 *                 type: string
 *               password:
 *                 type: string
 *                 minLength: 6
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token using refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Token refreshed successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Invalid refresh token
 *       500:
 *         description: Server error
 */
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  validate,
  refreshToken
)

// OAuth routes (not fully documented as they redirect)
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

export default router
