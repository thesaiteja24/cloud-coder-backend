import jwt from 'jsonwebtoken'
import { logDebug } from '../utils/logger.js'

export const extractUserIdAndIp = (req, res, next) => {
  // Extract user ID from JWT
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1]
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
      console.log('Logging jwt payload', payload)
      req.userId = payload.id
    } catch (err) {
      req.userId = null // Invalid or expired token
    }
  } else {
    req.userId = null // No token provided
  }

  // Extract IP address
  req.clientIp = req.ip || req.ips?.[0] || 'unknown' // Use req.ip or req.ips for proxies
  next()
}
