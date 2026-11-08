'use strict'

const LOG_LEVELS = new Set(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])

const parseInteger = (name, value, fallback, { min, max }) => {
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`)
  }
  return parsed
}

const loadConfig = (env = process.env) => {
  const logLevel = env.LOG_LEVEL || 'info'
  if (!LOG_LEVELS.has(logLevel)) {
    throw new Error(`LOG_LEVEL must be one of: ${Array.from(LOG_LEVELS).join(', ')}`)
  }

  return {
    host: env.HOST || '0.0.0.0',
    port: parseInteger('PORT', env.PORT, 3000, { min: 1, max: 65535 }),
    logLevel,
    bodyLimit: parseInteger('REQUEST_BODY_LIMIT_BYTES', env.REQUEST_BODY_LIMIT_BYTES, 16 * 1024, {
      min: 1024,
      max: 1024 * 1024
    }),
    cacheTtlSeconds: parseInteger('CACHE_TTL_SECONDS', env.CACHE_TTL_SECONDS, 3600, {
      min: 1,
      max: 30 * 24 * 60 * 60
    }),
    cacheMaxEntries: parseInteger('CACHE_MAX_ENTRIES', env.CACHE_MAX_ENTRIES, 100, {
      min: 1,
      max: 10000
    }),
    cacheMaxBytes: parseInteger('CACHE_MAX_BYTES', env.CACHE_MAX_BYTES, 64 * 1024 * 1024, {
      min: 1024,
      max: 1024 * 1024 * 1024
    })
  }
}

module.exports = { loadConfig }
