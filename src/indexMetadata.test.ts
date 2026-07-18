import { describe, expect, it } from 'vitest'
import html from '../index.html?raw'
import { siteEditorialReviewDate } from './content/editorial'

describe('article metadata', () => {
  it('publishes the current editorial modification date', () => {
    const script = html.match(
      /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/,
    )?.[1]

    expect(script).toBeDefined()
    const metadata = JSON.parse(script ?? '{}') as Record<string, unknown>
    expect(metadata.dateModified).toBe(siteEditorialReviewDate.iso)
  })
})
