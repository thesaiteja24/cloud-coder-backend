import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'
import passport from 'passport'
import { getMissingFields } from '../utils/validateFields.js'
import { logInfo, logWarn, logError } from '../utils/logger.js'

configDotenv()

export const signup = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const requiredFields = ['username', 'name', 'email', 'password']
    const { username, name, email, password } = req.body
    const missingFields = getMissingFields(requiredFields, req.body)

    if (missingFields.length > 0) {
      logWarn('Missing required fields during signup', { missingFields }, req)
      return res
        .status(400)
        .json({ message: 'Missing required field(s)', missingFields })
    }

    const existingUser = await User.findOne(
      { $or: [{ email }, { username }] },
      null,
      { session }
    )
    if (existingUser) {
      logWarn('Email or username already exists', { email, username }, req)
      return res
        .status(400)
        .json({ message: 'Email or username already exists' })
    }

    const user = new User({ username, name, email, password })
    await user.save({ session })

    const accessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '14d' }
    )

    user.refreshToken = refreshToken
    await user.save({ session })

    await session.commitTransaction()
    logInfo('User signed up successfully', { userId: user._id, email }, req)
    res.status(201).json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username,
        name,
        email,
        profilePic: user.profilePic,
      },
    })
  } catch (err) {
    await session.abortTransaction()
    logError('Signup error', err, { email: req.body.email }, req)
    res.status(500).json({ message: 'Server error' })
  } finally {
    session.endSession()
  }
}

export const login = (req, res, next) => {
  passport.authenticate(
    'local',
    { session: false },
    async (err, user, info) => {
      if (err || !user) {
        logWarn(
          'Login failed',
          { message: info?.message || 'Unknown error' },
          req
        )
        return res
          .status(400)
          .json({ message: info?.message || 'Login failed' })
      }
      try {
        const accessToken = jwt.sign(
          { id: user._id },
          process.env.JWT_ACCESS_SECRET,
          { expiresIn: '15m' }
        )
        const refreshToken = jwt.sign(
          { id: user._id },
          process.env.JWT_REFRESH_SECRET,
          { expiresIn: '14d' }
        )
        user.refreshToken = refreshToken
        await user.save()
        logInfo(
          'User logged in successfully',
          { userId: user._id, email: user.email },
          req
        )
        res.json({
          accessToken,
          refreshToken,
          user: {
            id: user._id,
            username: user.username,
            name: user.name,
            email: user.email,
            profilePic: user.profilePic,
          },
        })
      } catch (err) {
        logError('Login error', err, { email: req.body.email }, req)
        res.status(500).json({ message: 'Server error' })
      }
    }
  )(req, res, next)
}

export const githubCallback = (req, res) => {
  try {
    const accessToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '14d' }
    )
    req.user.refreshToken = refreshToken
    req.user
      .save()
      .then(() => {
        logInfo(
          'GitHub login successful',
          { userId: req.user._id, email: req.user.email },
          req
        )
        res.redirect(
          `http://localhost:3000?accessToken=${accessToken}&refreshToken=${refreshToken}`
        )
      })
      .catch(err => {
        logError('GitHub callback error', err, { userId: req.user._id }, req)
        res.status(500).json({ message: 'Server error' })
      })
  } catch (err) {
    logError('GitHub callback error', err, { userId: req.user?._id }, req)
    res.status(500).json({ message: 'Server error' })
  }
}

export const googleCallback = (req, res) => {
  try {
    const accessToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    )
    const refreshToken = jwt.sign(
      { id: req.user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '14d' }
    )
    req.user.refreshToken = refreshToken
    req.user
      .save()
      .then(() => {
        logInfo(
          'Google login successful',
          { userId: req.user._id, email: req.user.email },
          req
        )
        res.redirect(
          `http://localhost:3000?accessToken=${accessToken}&refreshToken=${refreshToken}`
        )
      })
      .catch(err => {
        logError('Google callback error', err, { userId: req.user._id }, req)
        res.status(500).json({ message: 'Server error' })
      })
  } catch (err) {
    logError('Google callback error', err, { userId: req.user?._id }, req)
    res.status(500).json({ message: 'Server error' })
  }
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    logWarn('Refresh token required', {}, req)
    return res.status(401).json({ message: 'Refresh token required' })
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.id)
    if (!user || user.refreshToken !== refreshToken) {
      logWarn('Invalid refresh token', { userId: payload.id }, req)
      return res.status(401).json({ message: 'Invalid refresh token' })
    }
    const newAccessToken = jwt.sign(
      { id: user._id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '15m' }
    )
    const newRefreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '14d' }
    )
    user.refreshToken = newRefreshToken
    await user.save()
    logInfo('Token refreshed successfully', { userId: user._id }, req)
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    logError('Refresh token error', err, {}, req)
    res.status(401).json({ message: 'Invalid refresh token' })
  }
}
