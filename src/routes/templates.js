'use strict'

const { TEMPLATES } = require('../templates')

const templatesRoute = async (app) => {
  app.get('/api/v1/templates', async () => ({ templates: TEMPLATES }))
}

module.exports = templatesRoute
