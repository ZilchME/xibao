'use strict'

const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { LRUCache } = require('lru-cache')
const { TEMPLATES } = require('../templates')

const STYLE_KEYS = ['fontSize', 'color', 'strokeColor', 'strokeSize', 'lineSpace']
const PROJECT_ROOT = path.resolve(__dirname, '../..')
const RENDERER_FILES = [
  'index.js',
  'assets/xibao.webp',
  'assets/beibao.webp',
  'assets/font.ttf'
]

const rendererHash = createHash('sha256')
for (const file of RENDERER_FILES) {
  rendererHash.update(file).update('\0').update(readFileSync(path.join(PROJECT_ROOT, file)))
}
const rendererFingerprint = rendererHash.digest('hex')

const normalizeImageRequest = ({ template, text, style = {}, output = 'jpeg' }) => {
  const templateConfig = TEMPLATES.find(item => item.id === template)
  if (!templateConfig) throw new Error(`Unknown image template: ${template}`)

  const normalizedStyle = Object.fromEntries(
    STYLE_KEYS.map(key => [key, style[key] === undefined ? templateConfig.defaultStyle[key] : style[key]])
  )

  return { template, text, style: normalizedStyle, output }
}

const getCacheKey = (normalizedRequest) => createHash('sha256')
  .update(rendererFingerprint)
  .update('\0')
  .update(JSON.stringify(normalizedRequest))
  .digest('hex')

const createImageCache = ({ cacheTtlSeconds, cacheMaxEntries, cacheMaxBytes }) => {
  const cache = new LRUCache({
    max: cacheMaxEntries,
    maxSize: cacheMaxBytes,
    maxEntrySize: cacheMaxBytes,
    ttl: cacheTtlSeconds * 1000,
    sizeCalculation: buffer => buffer.byteLength
  })
  const inFlight = new Map()

  return {
    async getOrCreate(normalizedRequest, generate) {
      const key = getCacheKey(normalizedRequest)
      const cached = cache.get(key)
      if (cached !== undefined) return { buffer: cached, status: 'HIT' }

      const pending = inFlight.get(key)
      if (pending) return { buffer: await pending, status: 'COALESCED' }

      const generation = Promise.resolve().then(generate)
      inFlight.set(key, generation)
      try {
        const buffer = await generation
        if (!Buffer.isBuffer(buffer)) throw new TypeError('Image generator must return a Buffer')
        cache.set(key, buffer)
        return { buffer, status: 'MISS' }
      } finally {
        if (inFlight.get(key) === generation) inFlight.delete(key)
      }
    }
  }
}

module.exports = { createImageCache, normalizeImageRequest }
