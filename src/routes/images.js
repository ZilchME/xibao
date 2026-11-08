'use strict'

const { renderPreset } = require('../..')
const { TEMPLATE_IDS } = require('../templates')
const { normalizeImageRequest } = require('../cache/image-cache')

const colorPattern = '^(?:#[0-9a-fA-F]{3,4}|#[0-9a-fA-F]{6}(?:[0-9a-fA-F]{2})?|[a-zA-Z]{1,20})$'

const imageRequestSchema = {
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['template', 'text'],
    properties: {
      template: { type: 'string', enum: TEMPLATE_IDS },
      text: {
        anyOf: [
          { type: 'string', minLength: 1, maxLength: 512 },
          {
            type: 'array',
            minItems: 1,
            maxItems: 16,
            items: { type: 'string', minLength: 1, maxLength: 128 }
          }
        ]
      },
      output: { type: 'string', enum: ['jpeg', 'png'] },
      style: {
        type: 'object',
        additionalProperties: false,
        properties: {
          fontSize: { type: 'integer', minimum: 8, maximum: 300 },
          color: { type: 'string', pattern: colorPattern },
          strokeColor: { type: 'string', pattern: colorPattern },
          strokeSize: { type: 'integer', minimum: 0, maximum: 32 },
          lineSpace: { type: 'integer', minimum: 0, maximum: 128 }
        }
      }
    }
  }
}

const getTextStats = (text) => {
  const lines = Array.isArray(text) ? text : text.split('\n')
  return {
    lines,
    characterCount: lines.reduce((total, line) => total + Array.from(line).length, 0)
  }
}

const imagesRoute = async (app, { imageCache }) => {
  app.post('/api/v1/images', {
    schema: {
      ...imageRequestSchema,
      tags: ['Images'],
      summary: '生成图片',
      description: '按模板生成喜报或悲报图片，响应体为 JPEG 或 PNG 图片二进制。缓存状态见 X-Cache 响应头。',
      body: {
        ...imageRequestSchema.body,
        examples: [{
          template: 'xibao',
          text: ['本群已升级', '成为喜报群'],
          output: 'jpeg',
          style: { fontSize: 108, color: 'red' }
        }]
      },
      response: {
        200: {
          description: '生成的图片',
          headers: {
            'X-Cache': {
              description: '缓存状态：命中、生成或复用并发生成任务。',
              schema: { type: 'string', enum: ['HIT', 'MISS', 'COALESCED'] }
            }
          },
          content: {
            'image/jpeg': { schema: { type: 'string', format: 'binary' } },
            'image/png': { schema: { type: 'string', format: 'binary' } }
          }
        },
        400: {
          description: '请求参数无效',
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' },
                details: { type: 'array', items: { type: 'object' } }
              }
            }
          }
        },
        413: {
          description: '请求体超过大小上限',
          type: 'object',
          properties: { error: { type: 'object' } }
        },
        415: {
          description: 'Content-Type 必须为 application/json',
          type: 'object',
          properties: { error: { type: 'object' } }
        },
        500: {
          description: '图片生成失败',
          type: 'object',
          properties: { error: { type: 'object' } }
        }
      }
    }
  }, async (request, reply) => {
    const { template, text, style = {}, output = 'jpeg' } = request.body
    const { lines, characterCount } = getTextStats(text)

    if (lines.length > 16 || characterCount > 512 || lines.every(line => !line.trim())) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_TEXT',
          message: 'text must contain 1 to 16 non-empty lines and no more than 512 characters'
        }
      })
    }

    if (lines.some(line => /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(line))) {
      return reply.code(400).send({
        error: {
          code: 'INVALID_TEXT',
          message: 'text contains unsupported control characters'
        }
      })
    }

    const normalizedRequest = normalizeImageRequest({ template, text, style, output })
    const { buffer, status } = await imageCache.getOrCreate(normalizedRequest, async () => {
      let image = await renderPreset(template, text, normalizedRequest.style)
      if (output === 'png') image = image.png()
      else image = image.jpeg()
      return image.toBuffer()
    })

    reply
      .header('Content-Type', output === 'png' ? 'image/png' : 'image/jpeg')
      .header('Content-Length', buffer.length)
      .header('Content-Disposition', `inline; filename="${template}.${output}"`)
      .header('X-Content-Type-Options', 'nosniff')
      .header('X-Cache', status)
      .code(200)
      .send(buffer)
  })
}

module.exports = imagesRoute
