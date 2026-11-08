'use strict'

const healthRoute = async (app) => {
  app.get('/healthz', {
    schema: {
      tags: ['System'],
      summary: '健康检查',
      description: '确认 API 服务进程正在运行。',
      response: {
        200: {
          description: '服务正常',
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string', enum: ['ok'] } }
        }
      }
    }
  }, async () => ({ status: 'ok' }))
}

module.exports = healthRoute
