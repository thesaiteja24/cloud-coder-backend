import express from 'express'
import { configDotenv } from 'dotenv'

const app = express()
configDotenv()

const PORT = process.env.PORT

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server Running on http://localhost:${PORT}`)
})
