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

const parsePublicBaseUrl = (value) => {
  if (!value) return null

  let parsed
  try {
    parsed = new URL(value)
  } catch {
    throw new Error('PUBLIC_BASE_URL must be a valid absolute URL')
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('PUBLIC_BASE_URL must use http(s) and cannot include credentials, query, or fragment')
  }

  return value.replace(/\/+$/, '')
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
    publicBaseUrl: parsePublicBaseUrl(env.PUBLIC_BASE_URL),
    bodyLimit: parseInteger('REQUEST_BODY_LIMIT_BYTES', env.REQUEST_BODY_LIMIT_BYTES, 16 * 1024, {
      min: 1024,
      max: 1024 * 1024
    })
  }
}

module.exports = { loadConfig }
