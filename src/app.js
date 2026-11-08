'use strict'

const Fastify = require('fastify')
const { loadConfig } = require('./config')
const healthRoute = require('./routes/health')
const templatesRoute = require('./routes/templates')
const imagesRoute = require('./routes/images')

const createApp = (options = {}) => {
  const config = options.config || loadConfig()
  const app = Fastify({
    logger: options.logger === undefined ? { level: config.logLevel } : options.logger,
    bodyLimit: config.bodyLimit
  })

  app.register(healthRoute)
  app.register(templatesRoute)
  app.register(imagesRoute)

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'route not found'
      }
    })
  })

  app.setErrorHandler((error, request, reply) => {
    if (error.validation) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_REQUEST',
          message: 'request validation failed',
          details: error.validation.map(item => ({
            field: item.instancePath || item.params?.missingProperty || '',
            message: item.message
          }))
        }
      })
    }

    if (error.statusCode === 413) {
      return reply.code(413).send({
        error: { code: 'PAYLOAD_TOO_LARGE', message: 'request body is too large' }
      })
    }

    if (error.statusCode === 400) {
      return reply.code(400).send({
        error: { code: 'INVALID_REQUEST', message: 'request body could not be parsed' }
      })
    }

    if (error.statusCode === 415) {
      return reply.code(415).send({
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'content type must be application/json' }
      })
    }

    request.log.error({ err: error }, 'Request failed')
    return reply.code(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'an internal error occurred' }
    })
  })

  return app
}

module.exports = { createApp }
