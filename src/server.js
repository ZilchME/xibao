'use strict'

const { createApp } = require('./app')
const { loadConfig } = require('./config')

const start = async () => {
  const config = loadConfig()
  const app = createApp({ config })

  const shutdown = async (signal) => {
    app.log.info({ signal }, 'Shutting down API server')
    try {
      await app.close()
    } catch (error) {
      app.log.error(error, 'Error while closing API server')
      process.exitCode = 1
    }
  }

  process.once('SIGINT', () => shutdown('SIGINT'))
  process.once('SIGTERM', () => shutdown('SIGTERM'))

  try {
    await app.listen({ host: config.host, port: config.port })
  } catch (error) {
    app.log.error(error, 'Unable to start API server')
    process.exitCode = 1
  }
}

if (require.main === module) {
  start()
}

module.exports = { start }
