'use strict'

const { TEMPLATES } = require('../templates')

const templatesRoute = async (app) => {
  app.get('/api/v1/templates', {
    schema: {
      tags: ['Images'],
      summary: '列出图片模板',
      description: '返回可用模板及其默认文字样式。',
      response: {
        200: {
          description: '可用模板',
          type: 'object',
          required: ['templates'],
          properties: {
            templates: {
              type: 'array',
              items: {
                type: 'object',
                required: ['id', 'name', 'defaultStyle'],
                properties: {
                  id: { type: 'string', enum: ['xibao', 'beibao'] },
                  name: { type: 'string' },
                  defaultStyle: {
                    type: 'object',
                    required: ['color', 'strokeColor', 'strokeSize', 'fontSize', 'lineSpace'],
                    properties: {
                      color: { type: 'string' },
                      strokeColor: { type: 'string' },
                      strokeSize: { type: 'integer' },
                      fontSize: { type: 'integer' },
                      lineSpace: { type: 'integer' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, async () => ({ templates: TEMPLATES }))
}

module.exports = templatesRoute
