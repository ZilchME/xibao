'use strict'

const healthRoute = async (app) => {
  app.get('/healthz', async () => ({ status: 'ok' }))
}

module.exports = healthRoute
