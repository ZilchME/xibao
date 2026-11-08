'use strict'

const TEMPLATES = Object.freeze([
  Object.freeze({
    id: 'xibao',
    name: '喜报',
    defaultStyle: Object.freeze({ color: 'red', strokeColor: '#fcf88d', strokeSize: 12, fontSize: 108, lineSpace: 16 })
  }),
  Object.freeze({
    id: 'beibao',
    name: '悲报',
    defaultStyle: Object.freeze({ color: '#2d2d2d', strokeColor: 'white', strokeSize: 12, fontSize: 108, lineSpace: 16 })
  })
])

const TEMPLATE_IDS = TEMPLATES.map(template => template.id)

module.exports = { TEMPLATES, TEMPLATE_IDS }
