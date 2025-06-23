// swagger.js
import { configDotenv } from 'dotenv'

configDotenv()

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'Cloud Coder API Documentation',
    version: '1.0.0',
    description: 'API for Cloud Code application',
  },
  servers: [
    {
      url: `http://localhost:${process.env.PORT || 3000}/api`,
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
}

const options = {
  swaggerDefinition,
  apis: ['./routes/*.js', './controllers/*.js'], // Scan routes and controllers for JSDoc comments
}

export default options
