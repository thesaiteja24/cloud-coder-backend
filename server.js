import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import { configDotenv } from 'dotenv'
import morgan from 'morgan'
import { morganStream, logInfo, logError } from './utils/logger.js'
import routes from './routes/index.routes.js'
import './config/passport.js'
import cors from 'cors'
import http from 'http'
import helmet from 'helmet'
// Implementing swagger
import swaggerUi from 'swagger-ui-express'
import swaggerJSDoc from 'swagger-jsdoc'
import swagggerOptions from './config/swagger.js'
import { initSocket } from './services/websocket.js'

configDotenv()

const app = express()
const PORT = process.env.PORT

// Mock req for non-request contexts (e.g., server startup, MongoDB connection)
const mockReq = { userId: null, ip: '127.0.0.1' }

morgan.token('user-id', req => req.user?._id || 'anonymous')
morgan.token('client-ip', req => req.ip || req.ips?.[0] || 'unknown')

app.use(express.json())
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

const server = http.createServer(app)
initSocket(server)

server.listen(PORT, '0.0.0.0', () => {
  logInfo(`Server Running on http://localhost:${PORT}`, {}, mockReq)
})
