import express from 'express'
import mongoose from 'mongoose'
import passport from 'passport'
import { configDotenv } from 'dotenv'
import routes from './routes/indexRoutes.js'

configDotenv()

const app = express()
const PORT = process.env.PORT

app.use(express.json())
app.use(passport.initialize())
app.use('/api', routes)

mongoose
  .connect(process.env.MONGO_URI, {
    autoIndex: false,
  })
  .then(() => console.log('Connected to MongoDB Successfully'))
  .catch(error => console.error('Failed to establish connection:', error))

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on http://localhost:${PORT}`)
})
