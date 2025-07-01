import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import { configDotenv } from 'dotenv'
import morgan from 'morgan'
import { morganStream, logInfo, logError } from './utils/logger.js'
import routes from './routes/indexRoutes.js'
import { extractUserIdAndIp } from './middlewares/extractUserIdAndIp.js'
import './config/passport.js'
import cors from 'cors'
import helmet from 'helmet'
// Implementing swagger
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import swagggerOptions from './config/swagger.js'
configDotenv()

const app = express()
const PORT = process.env.PORT

// Mock req for non-request contexts (e.g., server startup, MongoDB connection)
const mockReq = { userId: null, clientIp: '127.0.0.1' }

morgan.token('user-id', req => req.userId || 'anonymous')
morgan.token('client-ip', req => req.clientIp || 'unknown')

app.use(express.json())
app.use(extractUserIdAndIp)
app.use(passport.initialize())
app.use(cors())
app.use(helmet())
app.use('/api', routes)

// Swagger setup
const swaggerSpec = swaggerJSDoc(swagggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))

app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: message => morganStream.write(message, app.get('req')), // Pass req from app context
    },
    // Store req in app context for morganStream
    immediate: false,
    skip: req => {
      app.set('req', req) // Store req for morganStream
      return false
    },
  })
)

app.use((err, req, res, next) => {
  logError('Unexpected error', err, {}, req)
  res.status(500).json({ status: 'error', message: 'Internal server error' })
})

mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: process.env.NODE_ENV !== 'production',
  })
  .then(() => logInfo('Connected to MongoDB Successfully', {}, mockReq))
  .catch(error =>
    logError('Failed to establish connection', error, {}, mockReq)
  )

app.get('/api/ping', (req, res) => {
  logInfo('Pong', {}, req)
  res.send('Pong')
})

app.listen(PORT, '0.0.0.0', () => {
  logInfo(`Server Running on http://localhost:${PORT}`, {}, mockReq)
})
