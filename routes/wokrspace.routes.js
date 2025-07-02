import express from 'express'
import passport from 'passport'
import { startWorkspace } from '../controllers/workspace.controller.js'

const router = express.Router()

router.post(
  '/start',
  passport.authenticate('jwt', { session: false }),
  startWorkspace
)

export default router
