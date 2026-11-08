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
  app.post('/api/v1/images', { schema: imageRequestSchema }, async (request, reply) => {
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
