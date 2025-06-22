import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import { configDotenv } from 'dotenv'
import morgan from 'morgan'
import { morganStream, logInfo, logError } from './utils/logger.js'
import routes from './routes/indexRoutes.js'

configDotenv()

const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use(passport.initialize())
app.use('/api', routes)
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: morganStream,
  })
)

mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: process.env.NODE_ENV !== 'production',
  })
  .then(() => logInfo('Connected to MongoDB Successfully'))
  .catch(error => logError('Failed to establish connection', error))

app.get('/ping', (req, res) => {
  logInfo('Pong')
  res.send('Pong')
})

app.listen(PORT, '0.0.0.0', () => {
  logInfo(`Server Running on http://localhost:${PORT}`)
})
