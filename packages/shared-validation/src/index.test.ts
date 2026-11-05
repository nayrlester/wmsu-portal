import { describe, expect, it } from 'vitest'
import { parsePingQuery } from './index.js'

describe('parsePingQuery', () => {
  it('accepts empty query', () => {
    expect(parsePingQuery({})).toEqual({})
  })

  it('accepts echo', () => {
    expect(parsePingQuery({ echo: 'hello' })).toEqual({ echo: 'hello' })
  })
})
