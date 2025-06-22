import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { configDotenv } from 'dotenv'
import mongoose from 'mongoose'
import { getMissingFields } from '../utils/validateFields.js'

configDotenv()

export const signup = async (req, res) => {
  // Use a transaction to ensure atomicity
  // user creation and token storage succeed or fail together

  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    const requiredFields = ['username', 'name', 'email', 'password']
    const { username, name, email, password } = req.body
    const missingFields = getMissingFields(requiredFields, req.body)

    if (missingFields.length > 0) {
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
    console.error('Signup error:', err)
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
        console.error('Login error:', err)
        res.status(500).json({ message: 'Server error' })
      }
    }
  )(req, res, next)
}

export const githubCallback = (req, res) => {
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
      res.redirect(
        `http://localhost:3000?accessToken=${accessToken}&refreshToken=${refreshToken}`
      )
    })
    .catch(err => {
      console.error('GitHub callback error:', err)
      res.status(500).json({ message: 'Server error' })
    })
}

export const googleCallback = (req, res) => {
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
      res.redirect(
        `http://localhost:3000?accessToken=${accessToken}&refreshToken=${refreshToken}`
      )
    })
    .catch(err => {
      console.error('Google callback error:', err)
      res.status(500).json({ message: 'Server error' })
    })
}

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) {
    return res.status(401).json({ message: 'Refresh token required' })
  }
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    const user = await User.findById(payload.id)
    if (!user || user.refreshToken !== refreshToken) {
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
    res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken })
  } catch (err) {
    console.error('Refresh token error:', err)
    res.status(401).json({ message: 'Invalid refresh token' })
  }
}
