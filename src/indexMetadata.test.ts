import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'

describe('article metadata', () => {
  it('publishes the current editorial modification date', () => {
    expect(html).toContain('"dateModified": "2026-07-18"')
  })
})
