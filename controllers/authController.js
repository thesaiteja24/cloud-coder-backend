import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import User from '../models/User.js'
import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'
import passport from 'passport'
import { logInfo, logWarn, logError } from '../utils/logger.js'

configDotenv()

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

export const signup = async (req, res) => {
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const { username, name, email, password } = req.body

    const existingUser = await User.findOne(
      { $or: [{ email }, { username }] },
      null,
      { session }
    )
    if (existingUser) {
      logWarn('Email or username already exists', { email, username }, req)
      return res.status(400).json({
        status: 'error',
        message: 'Email or username already exists',
      })
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
      status: 'success',
      message: 'User created successfully',
      data: {
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          username,
          name,
          email,
          profilePic: user.profilePic,
        },
      },
    })
  } catch (err) {
    await session.abortTransaction()
    logError('Signup error', err, { email: req.body.email }, req)
    res.status(500).json({
      status: 'error',
      message: 'Server error occurred, please try again later',
    })
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
        return res.status(400).json({
          status: 'error',
          message: info?.message || 'Invalid email or password',
        })
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
          status: 'success',
          message: 'Login successful',
          data: {
            accessToken: accessToken,
            refreshToken,
            user: {
              id: user._id,
              username: user.username,
              name: user.name,
              email: user.email,
              profilePic: user.profilePic,
            },
          },
        })
      } catch (err) {
        logError('Login error', err, { email: req.body.email }, req)
        res.status(500).json({
          status: 'error',
          message: 'Server error occurred, please try again later',
        })
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
          `${process.env.FRONTEND_URL}/auth-callback?status=success&message=${encodeURIComponent('GitHub login successful')}&accessToken=${accessToken}&refreshToken=${refreshToken}`
        )
      })
      .catch(err => {
        logError('GitHub save error', err, { userId: req.user._id }, req)
        res.redirect(
          `${process.env.FRONTEND_URL}/auth-callback?status=error&message=${encodeURIComponent('Authentication failed')}`
        )
      })
  } catch (err) {
    logError('GitHub callback error', err, { userId: req.user?._id }, req)
    res.redirect(
      `${process.env.FRONTEND_URL}/auth-callback?status=error&message=${encodeURIComponent('Server error occurred')}`
    )
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
          `${process.env.FRONTEND_URL}/auth-callback?status=success&message=${encodeURIComponent('Google login successful')}&accessToken=${accessToken}&refreshToken=${refreshToken}`
        )
      })
      .catch(err => {
        logError('Google save error', err, { userId: req.user._id }, req)
        res.redirect(
          `${process.env.FRONTEND_URL}/auth-callback?status=error&message=${encodeURIComponent('Authentication failed')}`
        )
      })
  } catch (err) {
    logError('Google callback error', err, { userId: req.user?._id }, req)
    res.redirect(
      `${process.env.FRONTEND_URL}/auth-callback?status=error&message=${encodeURIComponent('Server error occurred')}`
    )
  }
}

export const logout = async (req, res) => {
  try {
    // req.user is populated by passport-jwt
    const user = await User.findById(req.user._id)
    if (!user) {
      logWarn('User not found during logout', { userId: req.user._id }, req)
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' })
    }
    user.refreshToken = null
    await user.save()
    logInfo('User logged out successfully', { userId: user._id }, req)
    res
      .status(200)
      .json({ status: 'success', message: 'Logged out successfully' })
  } catch (err) {
    logError('Logout error', err, { userId: req.user?._id }, req)
    res.status(500).json({ status: 'error', message: 'Server error' })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body
    if (!email) {
      logWarn('Email required for forgot password', {}, req)
      return res
        .status(400)
        .json({ status: 'error', message: 'Email is required' })
    }

    const user = await User.findOne({ email })
    if (!user) {
      logWarn('User not found for forgot password', { email }, req)
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' })
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex')
    user.resetPasswordExpiry = Date.now() + 3600000 // 1 hour expiry
    await user.save()

    // Send email
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&id=${user._id}`
    await transporter.sendMail({
      to: email,
      subject: 'Password Reset Request',
      html: `Click <a href="${resetUrl}">here</a> to reset your password. Link expires in 1 hour.`,
    })

    logInfo('Password reset email sent', { userId: user._id, email }, req)
    res
      .status(200)
      .json({ status: 'success', message: 'Password reset email sent' })
  } catch (err) {
    logError('Forgot password error', err, { email: req.body.email }, req)
    res.status(500).json({ status: 'error', message: 'Server error' })
  }
}

export const resetPassword = async (req, res) => {
  try {
    const { token, id, password } = req.body
    if (!token || !id || !password) {
      logWarn('Missing fields for reset password', {}, req)
      return res.status(400).json({
        status: 'success',
        message: 'Token, ID, and password are required',
      })
    }

    const user = await User.findById(id)
    if (!user) {
      logWarn('User not found for reset password', { userId: id }, req)
      return res
        .status(404)
        .json({ status: 'error', message: 'User not found' })
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    if (
      !user.resetPasswordToken ||
      user.resetPasswordToken !== hashedToken ||
      user.resetPasswordExpiry < Date.now()
    ) {
      logWarn('Invalid or expired reset token', { userId: id }, req)
      return res
        .status(400)
        .json({ status: 'error', message: 'Invalid or expired reset token' })
    }

    user.password = password
    user.resetPasswordToken = null
    user.resetPasswordExpiry = null
    await user.save()

    logInfo('Password reset successfully', { userId: user._id }, req)
    res
      .status(200)
      .json({ status: 'success', message: 'Password reset successfully' })
  } catch (err) {
    logError('Reset password error', err, { userId: req.body.id }, req)
    res.status(500).json({ status: 'error', message: 'Server error' })
  }
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    logWarn('Refresh token required', {}, req)
    return res
      .status(401)
      .json({ status: 'error', message: 'Refresh token required' })
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.id)
    if (!user || user.refreshToken !== refreshToken) {
      logWarn('Invalid refresh token', { userId: payload.id }, req)
      return res
        .status(401)
        .json({ status: 'error', message: 'Invalid refresh token' })
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
    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    })
  } catch (err) {
    logError('Refresh token error', err, {}, req)
    res.status(401).json({ status: 'error', message: 'Invalid refresh token' })
  }
}
